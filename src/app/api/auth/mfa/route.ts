import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { verifyPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitDistributed } from '@/lib/rate-limit'
import { sealSecret, openSecret } from '@/lib/secret-box'
import { encodeQrSvg } from '@/lib/qr'
import { generateTotpSecret, verifyTotp, totpAuthUri, formatSecretForDisplay, generateRecoveryCodes } from '@/lib/totp'

/**
 * Multi-factor authentication management for the signed-in user.
 *
 *   GET               current MFA status
 *   POST begin        create an unconfirmed secret and return a QR to scan
 *   POST confirm      prove possession with a code; MFA becomes active
 *   POST regenerate   issue a fresh set of recovery codes
 *   DELETE            disable MFA (requires the current password)
 *
 * The secret is stored encrypted and is only ever returned during enrolment,
 * before confirmation. Recovery codes are shown exactly once.
 */

export async function GET() {
  try {
    const user = await requireUser()
    const [account, secret, unusedCodes] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.userId }, select: { mfaEnabledAt: true } }),
      prisma.userMfaSecret.findUnique({ where: { userId: user.userId }, select: { confirmedAt: true } }),
      prisma.userRecoveryCode.count({ where: { userId: user.userId, usedAt: null } }),
    ])
    return NextResponse.json({
      enabled: Boolean(account?.mfaEnabledAt),
      enabledAt: account?.mfaEnabledAt ?? null,
      enrolmentPending: Boolean(secret && !secret.confirmedAt),
      recoveryCodesRemaining: unusedCodes,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('begin') }),
  z.object({ action: z.literal('confirm'), code: z.string().trim().min(6).max(10) }),
  z.object({ action: z.literal('regenerate-recovery-codes'), code: z.string().trim().min(6).max(10) }),
])

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const limit = await rateLimitDistributed(`mfa-manage:${user.userId}`, 20, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const input = await parseBody(request, postSchema)

    // ---- begin enrolment ---------------------------------------------------
    if (input.action === 'begin') {
      const account = await prisma.user.findUnique({ where: { id: user.userId }, select: { mfaEnabledAt: true } })
      if (account?.mfaEnabledAt) {
        throw new AuthzError('Two-factor authentication is already active. Disable it before enrolling again.', 409)
      }
      const secret = generateTotpSecret()
      // Replace any abandoned enrolment outright rather than accumulating rows.
      await prisma.userMfaSecret.upsert({
        where: { userId: user.userId },
        update: { secretCipher: sealSecret(secret), confirmedAt: null, lastUsedStep: null },
        create: { userId: user.userId, secretCipher: sealSecret(secret) },
      })
      const uri = totpAuthUri(secret, user.email)
      return NextResponse.json({
        // Shown only while unconfirmed, so an attacker with a stolen session
        // still cannot read the secret of an already-active enrolment.
        secret: formatSecretForDisplay(secret),
        otpauthUri: uri,
        qrSvg: encodeQrSvg(uri),
      })
    }

    const record = await prisma.userMfaSecret.findUnique({ where: { userId: user.userId } })
    if (!record) throw new AuthzError('Start enrolment before submitting a code', 409)
    const secret = openSecret(record.secretCipher)

    const result = verifyTotp(secret, input.code, {
      afterStep: record.lastUsedStep ? Number(record.lastUsedStep) : null,
    })
    if (!result.valid) {
      await logAudit({
        actorUserId: user.userId,
        action: 'MFA_CODE_REJECTED',
        resourceType: 'User',
        resourceId: user.userId,
      })
      throw new AuthzError('That code is not valid. Check your authenticator app and try again.', 400)
    }

    // ---- confirm enrolment -------------------------------------------------
    if (input.action === 'confirm') {
      const { plain, hashes } = generateRecoveryCodes()
      await prisma.$transaction(async (tx) => {
        await tx.userMfaSecret.update({
          where: { userId: user.userId },
          data: { confirmedAt: new Date(), lastUsedStep: BigInt(result.step!) },
        })
        await tx.user.update({ where: { id: user.userId }, data: { mfaEnabledAt: new Date() } })
        await tx.userRecoveryCode.deleteMany({ where: { userId: user.userId } })
        await tx.userRecoveryCode.createMany({
          data: hashes.map((codeHash) => ({ userId: user.userId, codeHash })),
        })
      })
      await logAudit({ actorUserId: user.userId, action: 'MFA_ENABLED', resourceType: 'User', resourceId: user.userId })
      // The only time these are ever returned in clear.
      return NextResponse.json({ success: true, recoveryCodes: plain })
    }

    // ---- regenerate recovery codes ----------------------------------------
    const { plain, hashes } = generateRecoveryCodes()
    await prisma.$transaction(async (tx) => {
      await tx.userMfaSecret.update({ where: { userId: user.userId }, data: { lastUsedStep: BigInt(result.step!) } })
      await tx.userRecoveryCode.deleteMany({ where: { userId: user.userId } })
      await tx.userRecoveryCode.createMany({ data: hashes.map((codeHash) => ({ userId: user.userId, codeHash })) })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'MFA_RECOVERY_CODES_REGENERATED',
      resourceType: 'User',
      resourceId: user.userId,
    })
    return NextResponse.json({ success: true, recoveryCodes: plain })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const limit = await rateLimitDistributed(`mfa-disable:${user.userId}`, 5, 60_000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again shortly.' }, { status: 429 })
    }

    // Turning off a security control requires re-proving who you are, so a
    // hijacked session cannot quietly remove the second factor.
    const { password } = await parseBody(request, z.object({ password: z.string().min(1) }))
    const account = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true, mfaEnabledAt: true },
    })
    if (!account) throw new AuthzError('Unauthorized', 401)
    if (!account.mfaEnabledAt) throw new AuthzError('Two-factor authentication is not enabled', 409)
    if (!(await verifyPassword(password, account.passwordHash))) {
      throw new AuthzError('That password is not correct', 400)
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.userId }, data: { mfaEnabledAt: null } })
      await tx.userMfaSecret.deleteMany({ where: { userId: user.userId } })
      await tx.userRecoveryCode.deleteMany({ where: { userId: user.userId } })
    })
    await logAudit({ actorUserId: user.userId, action: 'MFA_DISABLED', resourceType: 'User', resourceId: user.userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
