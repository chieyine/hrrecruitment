import { afterEach, describe, expect, it } from 'vitest'
import { shouldUseSecureCookies } from '@/lib/session'

const originalAppUrl = process.env.APP_URL
const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL
  else process.env.APP_URL = originalAppUrl
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
})

describe('session cookie transport', () => {
  it('keeps production cookies secure on the configured HTTPS origin', () => {
    process.env.NODE_ENV = 'production'
    process.env.APP_URL = 'https://recruitment.frad.org'
    expect(shouldUseSecureCookies()).toBe(true)
  })

  it('allows production-mode acceptance tests on an HTTP loopback origin', () => {
    process.env.NODE_ENV = 'production'
    process.env.APP_URL = 'http://127.0.0.1:3107'
    expect(shouldUseSecureCookies()).toBe(false)
  })
})
