import { NextResponse } from 'next/server'
import { getCurrentUser, getVerifiedUser, type UserSession } from './auth'
import { hasPermission } from './rbac'
import { logger } from './logger'
import { AuthzError } from './errors'

export { AuthzError }

export function authzResponse(err: unknown): NextResponse {
  if (err instanceof AuthzError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  logger.error('Unhandled API error', { error: err instanceof Error ? err.message : String(err) })
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/** Require any authenticated + active user. Throws AuthzError(401) otherwise. */
export async function requireUser(): Promise<UserSession> {
  const user = await getVerifiedUser()
  if (!user) throw new AuthzError('Unauthorized', 401)
  return user
}

/** Require an authenticated staff (non-candidate) user. */
export async function requireStaff(): Promise<UserSession> {
  const user = await requireUser()
  const onlyCandidate = user.roles.length > 0 && user.roles.every((r) => r === 'CANDIDATE')
  if (onlyCandidate || user.roles.length === 0) {
    throw new AuthzError('Forbidden', 403)
  }
  return user
}

/** Require one of the given role names. */
export async function requireRole(...roles: string[]): Promise<UserSession> {
  const user = await requireUser()
  if (user.roles.includes('SYSTEM_ADMIN')) return user
  if (!roles.some((r) => user.roles.includes(r))) {
    throw new AuthzError('Forbidden', 403)
  }
  return user
}

/** Require a granular RBAC permission code (wires lib/rbac.hasPermission). */
export async function requirePermission(
  permissionCode: string,
  scope?: { type?: string; id?: string }
): Promise<UserSession> {
  const user = await requireUser()
  const allowed = await hasPermission(user.userId, permissionCode, scope)
  if (!allowed) throw new AuthzError('Forbidden', 403)
  return user
}

/** Non-throwing helper retained for pages that redirect instead of 401. */
export async function optionalUser(): Promise<UserSession | null> {
  return getCurrentUser()
}
