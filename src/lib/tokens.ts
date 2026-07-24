import { randomBytes, createHash } from 'crypto'

/** Generate a high-entropy opaque token (safe to place in a URL). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

/** One-way hash for storing tokens at rest (never store the raw token). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
