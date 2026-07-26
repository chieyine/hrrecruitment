import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldUseSecureCookies } from '@/lib/session'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session cookie transport', () => {
  it('keeps production cookies secure on the configured HTTPS origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'https://recruitment.frad.org')
    expect(shouldUseSecureCookies()).toBe(true)
  })

  it('allows production-mode acceptance tests on an HTTP loopback origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'http://127.0.0.1:3107')
    expect(shouldUseSecureCookies()).toBe(false)
  })
})
