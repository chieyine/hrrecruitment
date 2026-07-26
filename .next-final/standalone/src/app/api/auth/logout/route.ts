import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { clearSession, revokeSession, revokeOtherSessions } from '@/lib/session'

/**
 * Ends this browser's session by clearing the cookie and revoking the
 * per-device session record.
 *
 * `sessionVersion` is the global revocation lever (password reset, email
 * change, administrative suspension) and is deliberately NOT bumped here:
 * doing so signed the user out of every other device every time they logged
 * out of one of them.
 *
 * Pass `{ "allDevices": true }` to opt into global revocation.
 */
export async function POST(request: Request) {
  const user = await getVerifiedUser()
  const body = (await request.json().catch(() => ({}))) as { allDevices?: unknown }
  const allDevices = body.allDevices === true

  if (user) {
    try {
      if (user.tokenId) await revokeSession(user.userId, user.tokenId)
      if (allDevices) {
        await revokeOtherSessions(user.userId)
        await prisma.user.update({ where: { id: user.userId }, data: { sessionVersion: { increment: 1 } } })
        await logAudit({
          actorUserId: user.userId,
          action: 'SESSIONS_REVOKED',
          resourceType: 'User',
          resourceId: user.userId,
        })
      }
    } catch (error) {
      // The cookie is cleared regardless: a bookkeeping failure must not leave
      // the user apparently signed in.
      logger.error('Session revocation failed during logout', {
        userId: user.userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return clearSession(NextResponse.json({ success: true, allDevices }))
}
