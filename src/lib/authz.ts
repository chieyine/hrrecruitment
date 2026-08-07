import { NextResponse } from 'next/server'
import { getCurrentUser, getVerifiedUser, type UserSession } from './auth'
import { logger } from './logger'
import { AuthzError } from './errors'
import { hasStaffRole } from './roles'

export { AuthzError }

/**
 * Well-known Prisma error codes mapped to the response a caller can act on.
 * Without this every unique-constraint or missing-record error surfaced as an
 * opaque 500, which hid real client mistakes and produced unusable error text.
 */
const PRISMA_STATUS: Record<string, { status: number; message: string }> = {
  P2000: { status: 400, message: 'A submitted value is too long for its field' },
  P2002: { status: 409, message: 'A record with these details already exists' },
  P2003: { status: 400, message: 'A referenced record does not exist' },
  P2011: { status: 400, message: 'A required value was not supplied' },
  P2014: { status: 409, message: 'This change would break a required relationship' },
  P2025: { status: 404, message: 'The requested record no longer exists' },
}

function prismaCode(err: unknown): string | null {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : null
}

export function authzResponse(err: unknown): NextResponse {
  if (err instanceof AuthzError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  // §28.10 A decision that could not be signed is reported as such rather than
  // as a generic internal error, because the caller's next step differs: nothing
  // was saved, and retrying is the correct response.
  if (err instanceof Error && err.name === 'SignatureRequiredError') {
    logger.error('Action aborted because its signature could not be captured', { error: err.message })
    return NextResponse.json({ error: err.message, signatureFailed: true }, { status: 503 })
  }
  const code = prismaCode(err)
  const known = code ? PRISMA_STATUS[code] : undefined
  if (known) {
    logger.warn('API request rejected by a database constraint', { prismaCode: code })
    return NextResponse.json({ error: known.message }, { status: known.status })
  }
  logger.error('Unhandled API error', {
    ...(code ? { prismaCode: code } : {}),
    error: err instanceof Error ? err.message : String(err),
  })
  // Never echo the underlying error text: it leaks schema and query internals.
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
  if (!hasStaffRole(user.roles)) {
    throw new AuthzError('Forbidden', 403)
  }
  return user
}

export function hasRequiredRole(userRoles: readonly string[], requiredRoles: readonly string[]): boolean {
  // System administrators do not inherit operational authority. If a system
  // administrator account also has an HR role by mistake, it may still enter
  // only handlers that explicitly name SYSTEM_ADMIN.
  if (userRoles.includes('SYSTEM_ADMIN') && !requiredRoles.includes('SYSTEM_ADMIN')) return false
  return requiredRoles.some((role) => userRoles.includes(role))
}

/** Require one of the given role names. */
export async function requireRole(...roles: string[]): Promise<UserSession> {
  const user = await requireUser()
  if (!hasRequiredRole(user.roles, roles)) {
    if (user.roles.includes('SYSTEM_ADMIN')) {
      throw new AuthzError('This action requires a separate operational account', 403)
    }
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
  // Imported lazily, matching lib/auth: this keeps Prisma out of the module
  // graph of every route that only needs authzResponse/requireUser.
  const { hasPermission } = await import('./rbac')
  const allowed = await hasPermission(user.userId, permissionCode, scope)
  if (!allowed) throw new AuthzError('Forbidden', 403)
  return user
}

/** Non-throwing helper retained for pages that redirect instead of 401. */
export async function optionalUser(): Promise<UserSession | null> {
  return getCurrentUser()
}
