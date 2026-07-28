import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmailVerifyToken, verifyEmailChangeToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const limit = await rateLimitDistributed(`verify-email:${clientIp(request)}`, 10, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { token?: unknown }
    const token = typeof body.token === 'string' ? body.token : ''
    // Bound the input: an unbounded string is pointless work for a JWT check.
    if (!token || token.length > 4096) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // A valid, unexpired, purpose-bound token is REQUIRED (no email-only verify).
    const emailChange = await verifyEmailChangeToken(token)
    const userId = emailChange?.userId || (await verifyEmailVerifyToken(token))
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    }

    if (emailChange) {
      const duplicate = await prisma.user.findUnique({ where: { email: emailChange.email } })
      if (duplicate && duplicate.id !== user.id)
        return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
    }
    if (emailChange) {
      const consumed = await prisma.user.updateMany({
        where: { id: user.id, sessionVersion: emailChange.sessionVersion },
        data: { email: emailChange.email, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } },
      })
      if (consumed.count !== 1)
        return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
    }
    await logAudit({ actorUserId: user.id, action: 'EMAIL_VERIFIED', resourceType: 'User', resourceId: user.id })

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    logger.error('Email verification failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
