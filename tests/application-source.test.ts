import { describe, expect, it } from 'vitest'
import {
  APPLICATION_SOURCE_COOKIE,
  applicationSourceFromCookieHeader,
  normalizeApplicationSource,
} from '@/lib/application-source'

describe('application source attribution', () => {
  it('normalizes known campaign sources into stable report values', () => {
    expect(normalizeApplicationSource('LinkedIn')).toBe('LINKEDIN')
    expect(normalizeApplicationSource('employee referral')).toBe('REFERRAL')
    expect(normalizeApplicationSource('unknown campaign')).toBe('OTHER')
  })

  it('reads the first-touch source cookie among other cookies', () => {
    expect(applicationSourceFromCookieHeader(`session=abc; ${APPLICATION_SOURCE_COOKIE}=JOB_BOARD; theme=light`)).toBe(
      'JOB_BOARD'
    )
  })

  it('fails safely when a client sends malformed percent encoding', () => {
    expect(applicationSourceFromCookieHeader(`${APPLICATION_SOURCE_COOKIE}=%E0%A4%A`)).toBe('OTHER')
  })

  it('defaults unattributed applications to direct', () => {
    expect(applicationSourceFromCookieHeader(null)).toBe('DIRECT')
    expect(applicationSourceFromCookieHeader('session=abc')).toBe('DIRECT')
  })
})
