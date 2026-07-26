import { describe, it, expect } from 'vitest'
import {
  base32Encode,
  base32Decode,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
  totpStep,
  totpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/totp'
import { encodeQrSvg } from '@/lib/qr'

/** RFC 4226 / RFC 6238 use the ASCII secret "12345678901234567890". */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

describe('base32', () => {
  it('matches the known encoding of the RFC test secret', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })

  it('round-trips', () => {
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890')
  })

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('ABC1!')).toThrow(/Invalid base32/)
  })
})

describe('TOTP against the RFC 6238 SHA-1 test vectors', () => {
  // Appendix B publishes 8-digit values; a 6-digit code is the last 6 digits.
  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ]

  for (const [seconds, expected] of vectors) {
    it(`t=${seconds} produces ${expected.slice(-6)}`, () => {
      expect(generateTotp(RFC_SECRET, seconds * 1000)).toBe(expected.slice(-6))
    })
  }
})

describe('verification', () => {
  const secret = generateTotpSecret()
  const now = 1_700_000_000_000

  it('accepts the current code', () => {
    expect(verifyTotp(secret, generateTotp(secret, now), { atMs: now }).valid).toBe(true)
  })

  it('tolerates one step of clock skew in each direction', () => {
    expect(verifyTotp(secret, generateTotp(secret, now - 30_000), { atMs: now }).valid).toBe(true)
    expect(verifyTotp(secret, generateTotp(secret, now + 30_000), { atMs: now }).valid).toBe(true)
  })

  it('rejects a code two steps away', () => {
    expect(verifyTotp(secret, generateTotp(secret, now - 90_000), { atMs: now }).valid).toBe(false)
  })

  it('rejects a wrong code and anything malformed', () => {
    expect(verifyTotp(secret, '000000', { atMs: now }).valid).toBe(false)
    expect(verifyTotp(secret, '12345', { atMs: now }).valid).toBe(false)
    expect(verifyTotp(secret, 'abcdef', { atMs: now }).valid).toBe(false)
    expect(verifyTotp(secret, '', { atMs: now }).valid).toBe(false)
  })

  it('refuses to accept the same step twice', () => {
    const code = generateTotp(secret, now)
    const first = verifyTotp(secret, code, { atMs: now })
    expect(first.valid).toBe(true)
    expect(first.step).toBe(totpStep(now))
    // Replaying the code once its step is recorded must fail.
    expect(verifyTotp(secret, code, { atMs: now, afterStep: first.step }).valid).toBe(false)
  })

  it('still accepts the next step after one is consumed', () => {
    const consumed = totpStep(now)
    const next = generateTotp(secret, now + 30_000)
    expect(verifyTotp(secret, next, { atMs: now + 30_000, afterStep: consumed }).valid).toBe(true)
  })
})

describe('enrolment helpers', () => {
  it('builds an otpauth URI an authenticator can read', () => {
    const uri = totpAuthUri('JBSWY3DPEHPK3PXP', 'someone@example.org')
    expect(uri.startsWith('otpauth://totp/FRAD%20Recruitment:someone%40example.org?')).toBe(true)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })

  it('issues ten single-use recovery codes and stores only hashes', () => {
    const { plain, hashes } = generateRecoveryCodes()
    expect(plain).toHaveLength(10)
    expect(new Set(plain).size).toBe(10)
    expect(hashes.every((hash) => /^[0-9a-f]{64}$/.test(hash))).toBe(true)
    // The stored hash must be reproducible from what the user types back.
    expect(hashRecoveryCode(plain[0].toLowerCase())).toBe(hashes[0])
    expect(hashRecoveryCode(` ${plain[3]} `)).toBe(hashes[3])
    // And no plaintext code should equal its hash.
    expect(hashes).not.toContain(plain[0])
  })

  it('generates a distinct 160-bit secret each time', () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateTotpSecret()))
    expect(secrets.size).toBe(20)
    expect(base32Decode([...secrets][0]).length).toBe(20)
  })
})

describe('QR encoding', () => {
  it('produces an SVG for a realistic otpauth URI', () => {
    const svg = encodeQrSvg(totpAuthUri(generateTotpSecret(), 'a.long.email.address@example.org'))
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox')
    expect(svg).toContain('<path d="M')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('refuses a payload larger than the supported versions', () => {
    expect(() => encodeQrSvg('x'.repeat(5000))).toThrow(/too large/i)
  })
})
