import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyResetToken } from '@/lib/auth'
import { parseBody, resetPasswordSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { token, password } = await parseBody(request, resetPasswordSchema)

    // A valid, unexpired, purpose-bound token is REQUIRED (fixes open reset).
    const reset = await verifyResetToken(token)
    if (!reset) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: reset.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, sessionVersion: reset.sessionVersion },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    })
    if (consumed.count !== 1) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    await logAudit({
      actorUserId: user.id,
      action: 'PASSWORD_RESET',
      resourceType: 'User',
      resourceId: user.id,
    }).catch((error) => logger.error('Password reset audit write failed after password commit', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    }))

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    return authzResponse(err)
  }
}
