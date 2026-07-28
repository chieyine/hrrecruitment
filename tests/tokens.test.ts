import { describe, it, expect } from 'vitest'
import { generateToken, hashToken } from '@/lib/tokens'
import { createResetToken, createSessionToken, verifySessionToken } from '@/lib/auth'

describe('tokens', () => {
  it('generates unique high-entropy tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(64)
  })
  it('hashes deterministically and differs by input', () => {
    expect(hashToken('abc')).toEqual(hashToken('abc'))
    expect(hashToken('abc')).not.toEqual(hashToken('abd'))
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/)
  })
  it('does not accept a purpose-specific token as a browser session', async () => {
    const reset = await createResetToken('user-1', 1)
    expect(await verifySessionToken(reset)).toBeNull()
    const session = await createSessionToken({
      userId: 'user-1',
      email: 'candidate@example.org',
      roles: ['CANDIDATE'],
      sessionVersion: 1,
    })
    expect(await verifySessionToken(session)).toMatchObject({ userId: 'user-1', roles: ['CANDIDATE'] })
  })
})
