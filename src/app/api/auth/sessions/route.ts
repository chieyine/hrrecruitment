import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { revokeSession, revokeOtherSessions } from '@/lib/session'

/**
 * Lets a user see where they are signed in and revoke a single device.
 *
 * `sessionVersion` remains the all-or-nothing lever; this is the per-device one.
 */

export async function GET() {
  try {
    const user = await requireUser()
    const sessions = await prisma.userSession.findMany({
      where: { userId: user.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
      select: {
        tokenId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    })
    return NextResponse.json({
      sessions: sessions.map((session) => ({
        ...session,
        // So the UI can label the row the user is currently looking at.
        current: session.tokenId === user.tokenId,
      })),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

const schema = z.union([z.object({ tokenId: z.string().uuid() }), z.object({ allOthers: z.literal(true) })])

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)

    if ('allOthers' in input) {
      const revoked = await revokeOtherSessions(user.userId, user.tokenId)
      await logAudit({
        actorUserId: user.userId,
        action: 'SESSIONS_REVOKED_OTHERS',
        resourceType: 'User',
        resourceId: user.userId,
        newValue: { revoked },
      })
      return NextResponse.json({ success: true, revoked })
    }

    if (input.tokenId === user.tokenId) {
      throw new AuthzError('Use sign out to end the session you are currently using', 400)
    }
    if (!(await revokeSession(user.userId, input.tokenId))) {
      throw new AuthzError('That session is already ended', 404)
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'SESSION_REVOKED',
      resourceType: 'UserSession',
      resourceId: input.tokenId,
    })
    return NextResponse.json({ success: true, revoked: 1 })
  } catch (error) {
    return authzResponse(error)
  }
}
