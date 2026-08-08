import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

/**
 * Resolve the JWT signing secret. No insecure fallback: the process must be
 * configured with a real secret or token operations fail loudly.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not configured (must be set and at least 32 characters). Refusing to sign or verify tokens.'
    )
  }
  return new TextEncoder().encode(secret)
}

export interface UserSession {
  userId: string
  email: string
  roles: string[]
  sessionVersion: number
  /**
   * Read from the database on every verified load, never from the token, so a
   * revoked or newly completed verification takes effect immediately. §28.8
   * internal-vacancy access depends on this being current.
   */
  emailVerifiedAt: Date | null
  /** Per-device session id. Present on tokens issued after per-device sessions landed. */
  tokenId?: string
}

/**
 * bcrypt cost factor. 12 is the current sensible default: ~250ms on modern
 * server hardware, which is a meaningful brake on offline cracking while
 * staying inside a normal request budget.
 */
const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/** True when a stored hash was produced with a weaker cost than we now use. */
export function passwordHashNeedsUpgrade(hash: string): boolean {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(hash)
  return !match || Number(match[1]) < BCRYPT_ROUNDS
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export const SESSION_TTL_SECONDS = 86_400

export async function createSessionToken(payload: Omit<UserSession, 'emailVerifiedAt'>): Promise<string> {
  return new SignJWT({ ...payload, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret())
}

/**
 * Short-lived token that stands between a correct password and a session while
 * the second factor is collected. It is NOT a session: it carries a distinct
 * purpose, so verifySessionToken rejects it outright.
 */
export async function createMfaChallengeToken(userId: string, sessionVersion: number): Promise<string> {
  return new SignJWT({ userId, sessionVersion, purpose: 'mfa_challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getJwtSecret())
}

export async function verifyMfaChallengeToken(
  token: string
): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const record = payload as unknown as { purpose?: string; userId?: string; sessionVersion?: number }
    if (record.purpose !== 'mfa_challenge' || !record.userId || !Number.isInteger(record.sessionVersion)) return null
    return { userId: String(record.userId), sessionVersion: Number(record.sessionVersion) }
  } catch {
    return null
  }
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const verified = await jwtVerify(token, getJwtSecret())
    const payload = verified.payload as unknown as UserSession & { purpose?: string }
    if (
      payload.purpose !== 'session' ||
      !payload.userId ||
      !Array.isArray(payload.roles) ||
      !Number.isInteger(payload.sessionVersion)
    )
      return null
    // Verification status is deliberately not carried in the token: it would go
    // stale the moment a user verified or an administrator revoked it. A
    // token-only read therefore reports "not verified" and fails closed, and
    // anything that depends on it must use getVerifiedUser().
    return { ...payload, emailVerifiedAt: null }
  } catch {
    return null
  }
}

/** Create a short-lived, signed password-reset token bound to a user id. */
export async function createResetToken(userId: string, sessionVersion: number): Promise<string> {
  return new SignJWT({ userId, sessionVersion, purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJwtSecret())
}

/** Verify a reset token and return its user id, or null if invalid/expired. */
export async function verifyResetToken(token: string): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if ((payload as any).purpose !== 'password_reset') return null
    const userId = (payload as any).userId
    const sessionVersion = (payload as any).sessionVersion
    if (!userId || !Number.isInteger(sessionVersion)) return null
    return { userId: String(userId), sessionVersion: Number(sessionVersion) }
  } catch {
    return null
  }
}

/** Signed email-verification token bound to a user id. */
export async function createEmailVerifyToken(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: 'email_verify' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret())
}

export async function verifyEmailVerifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if ((payload as any).purpose !== 'email_verify') return null
    return (payload as any).userId ?? null
  } catch {
    return null
  }
}

export async function createEmailChangeToken(userId: string, email: string, sessionVersion: number): Promise<string> {
  return new SignJWT({ userId, email, sessionVersion, purpose: 'email_change' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJwtSecret())
}

export async function verifyEmailChangeToken(
  token: string
): Promise<{ userId: string; email: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const sessionVersion = (payload as any).sessionVersion
    if (
      (payload as any).purpose !== 'email_change' ||
      !(payload as any).userId ||
      !(payload as any).email ||
      !Number.isInteger(sessionVersion)
    )
      return null
    return {
      userId: String((payload as any).userId),
      email: String((payload as any).email),
      sessionVersion: Number(sessionVersion),
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value
  if (!token) return null
  return verifySessionToken(token)
}

/**
 * Like getCurrentUser but re-validates the account against the database so a
 * suspended/locked user cannot keep acting with a still-valid 24h token.
 * Returns null if the account no longer exists or is not ACTIVE.
 */
async function loadVerifiedUser(): Promise<UserSession | null> {
  const session = await getCurrentUser()
  if (!session) return null
  // Imported lazily to avoid pulling Prisma into edge/runtime that only needs token checks.
  const { prisma } = await import('./prisma')

  // Every current session carries a unique token id. Resolve the session,
  // account, roles and revocation state in one database round trip instead of
  // loading User and UserSession sequentially on every authenticated page.
  if (session.tokenId) {
    const record = await prisma.userSession.findUnique({
      where: { tokenId: session.tokenId },
      select: {
        userId: true,
        sessionVersion: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            email: true,
            emailVerifiedAt: true,
            accountStatus: true,
            sessionVersion: true,
            userRoles: { include: { role: true } },
          },
        },
      },
    })
    const user = record?.user
    if (
      !record ||
      !user ||
      record.userId !== session.userId ||
      record.sessionVersion !== session.sessionVersion ||
      record.revokedAt ||
      record.expiresAt <= new Date() ||
      user.accountStatus !== 'ACTIVE' ||
      user.sessionVersion !== session.sessionVersion
    )
      return null
    return {
      userId: session.userId,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      roles: user.userRoles
        .filter((assignment) => (assignment.scopeType || 'GLOBAL') === 'GLOBAL')
        .map((assignment) => assignment.role.name),
      sessionVersion: user.sessionVersion,
      tokenId: session.tokenId,
    }
  }

  // Compatibility path for sessions issued before per-device records existed.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      emailVerifiedAt: true,
      accountStatus: true,
      sessionVersion: true,
      userRoles: { include: { role: true } },
    },
  })
  if (!user || user.accountStatus !== 'ACTIVE' || user.sessionVersion !== session.sessionVersion) return null

  return {
    userId: session.userId,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    // Role names in the session are used only for coarse area routing. Scoped
    // assignments must never become global privileges merely by appearing in
    // this flattened list; resource-level checks use hasPermission().
    roles: user.userRoles
      .filter((assignment) => (assignment.scopeType || 'GLOBAL') === 'GLOBAL')
      .map((assignment) => assignment.role.name),
    sessionVersion: user.sessionVersion,
    tokenId: session.tokenId,
  }
}

export const getVerifiedUser = loadVerifiedUser
