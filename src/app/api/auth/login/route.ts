import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword, passwordHashNeedsUpgrade, createMfaChallengeToken } from '@/lib/auth'
import { parseBody, loginSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { issueSession, attachSession } from '@/lib/session'
import {
  recordFailedLogin,
  clearFailedLogins,
  isTemporarilyLocked,
  lockRetrySeconds,
  LOCKOUT_MINUTES,
} from '@/lib/lockout'

/**
 * A fixed bcrypt hash of an unguessable value. Comparing against it for
 * unknown accounts keeps the work factor (and therefore the response time)
 * indistinguishable from a real failed login. Its cost matches BCRYPT_ROUNDS
 * so the dummy comparison is as expensive as a genuine one.
 */
const DUMMY_PASSWORD_HASH = '$2a$12$hVFarUWeyHmEr8A/n.jccekch33EZYpVN0vyxt6eptnHNFGq65kbG'

/** One message for every failure mode that must not disclose account state. */
const GENERIC_FAILURE = 'Invalid email or password'

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    // Keep a generous request-volume ceiling for password-hashing protection.
    // Failed credentials are subject to the tighter limits below; successful
    // logins must not lock out legitimate users or automated session renewal.
    const volumeLimit = await rateLimitDistributed(`login-volume:${ip}`, 100, 60_000)
    if (!volumeLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(volumeLimit.retryAfterSeconds) } }
      )
    }

    const { email, password } = await parseBody(request, loginSchema)
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { userRoles: { include: { role: true } } },
    })

    const throttleFailure = async () => {
      const [ipLimit, accountLimit] = await Promise.all([
        rateLimitDistributed(`login-failure:${ip}`, 10, 60_000),
        rateLimitDistributed(`login-account-failure:${normalizedEmail}`, 10, 15 * 60_000),
      ])
      if (!ipLimit.allowed || !accountLimit.allowed) {
        const retryAfter = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds)
        return NextResponse.json(
          { error: 'Too many attempts. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
      return null
    }

    if (!user) {
      // Spend the same password-hashing work as a real account so response
      // timing cannot be used to enumerate registered email addresses.
      await verifyPassword(password, DUMMY_PASSWORD_HASH)
      return (await throttleFailure()) ?? NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 })
    }

    // The password is always verified first. Every branch below that discloses
    // account state is gated on it, so none of them can be used as an oracle.
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (isValidPassword && isTemporarilyLocked(user)) {
      const retryAfter = lockRetrySeconds(user)
      return NextResponse.json(
        {
          error: `Too many failed attempts. This account is locked for ${LOCKOUT_MINUTES} minutes.`,
          lockedSeconds: retryAfter,
        },
        { status: 423, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    if (isValidPassword && user.accountStatus !== 'ACTIVE') {
      await logAudit({
        actorUserId: user.id,
        action: 'LOGIN_BLOCKED',
        resourceType: 'User',
        resourceId: user.id,
        reason: `Account status ${user.accountStatus}`,
      })
      return NextResponse.json({ error: 'Account is locked or suspended. Please contact HR.' }, { status: 403 })
    }

    if (!isValidPassword) {
      const { locked, attempts } = await recordFailedLogin(user)
      await logAudit({
        actorUserId: user.id,
        action: locked ? 'LOGIN_FAILED_ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        reason: locked ? `Locked after ${attempts} consecutive failures` : 'Incorrect password',
      })
      return (await throttleFailure()) ?? NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 })
    }

    const roles = user.userRoles
      .filter((assignment) => (assignment.scopeType || 'GLOBAL') === 'GLOBAL')
      .map((assignment) => assignment.role.name)

    // Correct password on a healthy account: clear the failure streak before
    // anything else, so a user who mistyped twice is not left mid-streak.
    await clearFailedLogins(user.id)

    // --- second factor ------------------------------------------------------
    if (user.mfaEnabledAt) {
      const challengeToken = await createMfaChallengeToken(user.id, user.sessionVersion)
      await logAudit({
        actorUserId: user.id,
        action: 'LOGIN_MFA_CHALLENGED',
        resourceType: 'User',
        resourceId: user.id,
      })
      // Deliberately no session cookie. The caller must complete
      // POST /api/auth/mfa/challenge with a code before a session exists.
      return NextResponse.json({ success: false, mfaRequired: true, challengeToken })
    }

    // Transparently re-hash a password stored at an older bcrypt cost. Login is
    // the only moment we hold the plaintext, so it is the only chance to do it.
    if (passwordHashNeedsUpgrade(user.passwordHash)) {
      await prisma.user
        .update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } })
        .catch((error) =>
          logger.warn('Password hash upgrade failed', {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          })
        )
    }

    const { token } = await issueSession(request, {
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })

    await logAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user.id,
    })

    return attachSession(NextResponse.json({ success: true, user: { id: user.id, email: user.email, roles } }), token)
  } catch (err) {
    return authzResponse(err)
  }
}
