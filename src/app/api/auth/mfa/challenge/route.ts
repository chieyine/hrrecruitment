import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyMfaChallengeToken } from '@/lib/auth'
import { parseBody } from '@/lib/validation'
import { authzResponse, AuthzError } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { issueSession, attachSession } from '@/lib/session'
import { openSecret } from '@/lib/secret-box'
import { verifyTotp, hashRecoveryCode } from '@/lib/totp'

/**
 * Second step of an MFA sign-in: exchange the challenge token issued by
 * /api/auth/login plus a TOTP code (or a single-use recovery code) for a
 * session.
 *
 * The challenge token is bound to the user's `sessionVersion`, so a password
 * change or administrative revocation between the two steps invalidates it.
 */

const schema = z.object({
  challengeToken: z.string().min(20).max(4096),
  code: z.string().trim().min(6).max(20),
})

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    const limit = await rateLimitDistributed(`mfa-challenge:${ip}`, 15, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const { challengeToken, code } = await parseBody(request, schema)
    const challenge = await verifyMfaChallengeToken(challengeToken)
    if (!challenge) throw new AuthzError('This sign-in attempt expired. Start again.', 401)

    // Tighter per-account limit: this is the step an attacker who already has
    // the password would brute-force, and a 6-digit code is only 10^6 wide.
    const accountLimit = await rateLimitDistributed(`mfa-challenge-account:${challenge.userId}`, 10, 15 * 60_000)
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(accountLimit.retryAfterSeconds) } }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      include: { userRoles: { include: { role: true } }, mfaSecret: true },
    })
    if (
      !user ||
      user.accountStatus !== 'ACTIVE' ||
      user.sessionVersion !== challenge.sessionVersion ||
      !user.mfaEnabledAt ||
      !user.mfaSecret
    ) {
      throw new AuthzError('This sign-in attempt expired. Start again.', 401)
    }

    const submitted = code.trim().toUpperCase()
    let method: 'TOTP' | 'RECOVERY_CODE' | null = null

    // A recovery code is longer than six digits, so the shapes never collide.
    if (/^\d{6}$/.test(submitted)) {
      const result = verifyTotp(openSecret(user.mfaSecret.secretCipher), submitted, {
        afterStep: user.mfaSecret.lastUsedStep ? Number(user.mfaSecret.lastUsedStep) : null,
      })
      if (result.valid) {
        // Record the step so this code cannot be replayed within its window.
        await prisma.userMfaSecret.update({
          where: { userId: user.id },
          data: { lastUsedStep: BigInt(result.step!) },
        })
        method = 'TOTP'
      }
    } else {
      const consumed = await prisma.userRecoveryCode.updateMany({
        where: { userId: user.id, codeHash: hashRecoveryCode(submitted), usedAt: null },
        data: { usedAt: new Date() },
      })
      if (consumed.count === 1) method = 'RECOVERY_CODE'
    }

    if (!method) {
      await logAudit({
        actorUserId: user.id,
        action: 'MFA_CHALLENGE_FAILED',
        resourceType: 'User',
        resourceId: user.id,
      })
      throw new AuthzError('That code is not valid', 401)
    }

    const roles = user.userRoles
      .filter((assignment) => (assignment.scopeType || 'GLOBAL') === 'GLOBAL')
      .map((assignment) => assignment.role.name)

    const { token } = await issueSession(request, {
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await logAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user.id,
      reason: `Second factor: ${method}`,
    })

    const remaining =
      method === 'RECOVERY_CODE'
        ? await prisma.userRecoveryCode.count({ where: { userId: user.id, usedAt: null } })
        : undefined

    return attachSession(
      NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, roles },
        // Warn the user when they are running out of recovery codes.
        ...(remaining !== undefined ? { recoveryCodesRemaining: remaining } : {}),
      }),
      token
    )
  } catch (error) {
    return authzResponse(error)
  }
}
