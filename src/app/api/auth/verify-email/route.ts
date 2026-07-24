import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmailVerifyToken, verifyEmailChangeToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { token } = await request.json().catch(() => ({}))
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // A valid, unexpired, purpose-bound token is REQUIRED (no email-only verify).
    const emailChange = await verifyEmailChangeToken(token)
    const userId = emailChange?.userId || await verifyEmailVerifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    }

    if (emailChange) {
      const duplicate = await prisma.user.findUnique({ where: { email: emailChange.email } })
      if (duplicate && duplicate.id !== user.id) return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
    }
    if (emailChange) {
      const consumed = await prisma.user.updateMany({ where: { id: user.id, sessionVersion: emailChange.sessionVersion }, data: { email: emailChange.email, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } } })
      if (consumed.count !== 1) return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
    }
    await logAudit({ actorUserId: user.id, action: 'EMAIL_VERIFIED', resourceType: 'User', resourceId: user.id })

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch {
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
