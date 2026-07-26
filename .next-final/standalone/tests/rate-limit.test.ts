import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rate limiter', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true)
    }
    const blocked = rateLimit(key, 3, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('keeps separate keys independent', () => {
    expect(rateLimit(`a-${Math.random()}`, 1, 60_000).allowed).toBe(true)
    expect(rateLimit(`b-${Math.random()}`, 1, 60_000).allowed).toBe(true)
  })
})
