import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { createSessionToken, SESSION_TTL_SECONDS, type UserSession } from './auth'
import { clientIp } from './rate-limit'
import { logger } from './logger'

/**
 * Single place where a signed-in session is minted.
 *
 * Previously the login and SSO routes each built the token and set the cookie
 * with their own copy of the options. Both now go through here, so the cookie
 * attributes, the TTL and the per-device `UserSession` record cannot drift apart.
 */

export const SESSION_COOKIE = 'session_token'

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export interface IssuedSession {
  token: string
  tokenId: string
}

/**
 * Record the device and mint a token bound to it. `tokenId` is the JWT's
 * per-device handle: revoking the row invalidates that one device without
 * touching `sessionVersion` (which signs out everything).
 */
export async function issueSession(request: Request, session: Omit<UserSession, 'tokenId'>): Promise<IssuedSession> {
  const tokenId = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

  await prisma.userSession.create({
    data: {
      userId: session.userId,
      tokenId,
      sessionVersion: session.sessionVersion,
      userAgent: request.headers.get('user-agent')?.slice(0, 400) || null,
      ipAddress: clientIp(request),
      expiresAt,
    },
  })

  // Opportunistically drop this user's long-dead rows so the table does not
  // grow without bound between retention runs.
  await prisma.userSession
    .deleteMany({ where: { userId: session.userId, expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } })
    .catch((error) =>
      logger.warn('Session pruning failed', { error: error instanceof Error ? error.message : String(error) })
    )

  return { token: await createSessionToken({ ...session, tokenId }), tokenId }
}

/** Attach a freshly issued session to a response. */
export function attachSession(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return response
}

/** Clear the session cookie using the same attributes it was written with. */
export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}

/** Mark one device's session revoked. */
export async function revokeSession(userId: string, tokenId: string): Promise<boolean> {
  const result = await prisma.userSession.updateMany({
    where: { userId, tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count > 0
}

/** Revoke every device except, optionally, the one making the request. */
export async function revokeOtherSessions(userId: string, keepTokenId?: string): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: { userId, revokedAt: null, ...(keepTokenId ? { tokenId: { not: keepTokenId } } : {}) },
    data: { revokedAt: new Date() },
  })
  return result.count
}

/** Refresh `lastSeenAt` so the session list is useful. Best-effort. */
export async function touchSession(tokenId: string): Promise<void> {
  await prisma.userSession
    .updateMany({ where: { tokenId, revokedAt: null }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined)
}
