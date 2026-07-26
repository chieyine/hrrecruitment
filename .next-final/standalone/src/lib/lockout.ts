import { prisma } from './prisma'
import { logAudit } from './audit'
import { createNotification } from './notifications'
import { logger } from './logger'

/**
 * Automatic account lockout after consecutive failed sign-in attempts.
 *
 * This complements rate limiting rather than replacing it. Rate limiting slows
 * an attacker down but never stops them and never tells the account owner; a
 * lockout does both. `lockedUntil` expires by itself so a real user recovers
 * without an administrator, while `accountStatus = 'LOCKED'` remains the
 * indefinite, manual lock an administrator applies.
 */

export const MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 8)
export const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES || 30)
/** Failures older than this no longer count towards the streak. */
const STREAK_WINDOW_MINUTES = 60

export function isTemporarilyLocked(user: { lockedUntil: Date | null }, now = new Date()): boolean {
  return Boolean(user.lockedUntil && user.lockedUntil > now)
}

export function lockRetrySeconds(user: { lockedUntil: Date | null }, now = new Date()): number {
  if (!user.lockedUntil) return 0
  return Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000))
}

/**
 * Count a failed attempt and lock the account once the threshold is reached.
 * Returns whether this attempt caused a lock.
 */
export async function recordFailedLogin(user: {
  id: string
  failedLoginCount: number
  lastFailedLoginAt: Date | null
}): Promise<{ locked: boolean; attempts: number }> {
  const now = new Date()
  const streakIsStale =
    !user.lastFailedLoginAt || now.getTime() - user.lastFailedLoginAt.getTime() > STREAK_WINDOW_MINUTES * 60_000
  const attempts = (streakIsStale ? 0 : user.failedLoginCount) + 1
  const locked = attempts >= MAX_FAILED_ATTEMPTS

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: locked ? 0 : attempts,
      lastFailedLoginAt: now,
      lockedUntil: locked ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : undefined,
    },
  })

  if (locked) {
    await logAudit({
      actorUserId: user.id,
      action: 'ACCOUNT_LOCKED_AUTOMATICALLY',
      resourceType: 'User',
      resourceId: user.id,
      reason: `${attempts} consecutive failed sign-in attempts`,
    })
    // Tell the owner: a lockout they did not cause is the signal that someone
    // is guessing at their password.
    await createNotification({
      userId: user.id,
      type: 'ACCOUNT_LOCKED',
      title: 'Your account was temporarily locked',
      body:
        `We locked your account for ${LOCKOUT_MINUTES} minutes after ${attempts} failed sign-in attempts. ` +
        `If this was not you, reset your password as soon as the lock expires.`,
    }).catch((error) =>
      logger.error('Lockout notification failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
    )
  }

  return { locked, attempts }
}

/** Clear the streak after a successful sign-in. */
export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null, lastLoginAt: new Date() },
  })
}
