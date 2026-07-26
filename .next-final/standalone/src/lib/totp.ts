import { createHmac, randomBytes, createHash, timingSafeEqual } from 'crypto'

/**
 * TOTP (RFC 6238) over HMAC-SHA1 with 6 digits and a 30-second step — the
 * parameters every mainstream authenticator app assumes.
 *
 * Implemented directly rather than pulled from a package: the algorithm is
 * about forty lines, and an authentication primitive is worth being able to
 * read in full.
 */

const DIGITS = 6
const STEP_SECONDS = 30
/** Accept the neighbouring steps so a slightly skewed device clock still works. */
const DEFAULT_WINDOW = 1

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** 160 bits of entropy, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** The counter value for a point in time. Exported so callers can store it and reject replays. */
export function totpStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / STEP_SECONDS)
}

function codeForStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  // Node's writeBigUInt64BE keeps the full 64-bit counter RFC 4226 specifies.
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

export function generateTotp(secret: string, atMs: number = Date.now()): string {
  return codeForStep(secret, totpStep(atMs))
}

/**
 * Verify a submitted code.
 *
 * Returns the step the code matched so the caller can persist it and refuse to
 * accept the same code twice — without that, a code is replayable for its whole
 * 30-second life (and for the accepted window either side of it).
 */
export function verifyTotp(
  secret: string,
  token: string,
  options: { atMs?: number; window?: number; afterStep?: number | null } = {}
): { valid: boolean; step?: number } {
  const candidate = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(candidate)) return { valid: false }

  const window = options.window ?? DEFAULT_WINDOW
  const current = totpStep(options.atMs ?? Date.now())

  for (let drift = -window; drift <= window; drift++) {
    const step = current + drift
    if (step < 0) continue
    // Reject anything at or before the last accepted step: that code is spent.
    if (options.afterStep != null && step <= options.afterStep) continue
    const expected = codeForStep(secret, step)
    const a = Buffer.from(expected)
    const b = Buffer.from(candidate)
    if (a.length === b.length && timingSafeEqual(a, b)) return { valid: true, step }
  }
  return { valid: false }
}

/** The `otpauth://` URI an authenticator app consumes, usually via a QR code. */
export function totpAuthUri(secret: string, accountName: string, issuer = 'FRAD Recruitment'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Recovery codes for when the authenticator device is lost. Returned in clear
 * exactly once at enrolment; only the hashes are ever stored.
 */
export function generateRecoveryCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain: string[] = []
  for (let index = 0; index < count; index++) {
    // Crockford-ish grouping: readable when transcribed off a printout.
    const raw = randomBytes(5).toString('hex').toUpperCase()
    plain.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`)
  }
  return { plain, hashes: plain.map(hashRecoveryCode) }
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

/** Format a secret in the four-character groups people expect when typing it in. */
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}
