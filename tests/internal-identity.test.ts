import { describe, expect, it } from 'vitest'
import {
  isInternalEmail,
  isInternalCandidate,
  emailDomain,
  visibleAudiencesFor,
  internalApplicationBlockReason,
} from '@/lib/internal-identity'

const verified = { email: 'ada@fradfoundation.org', emailVerifiedAt: new Date('2026-01-01') }
const unverified = { email: 'ada@fradfoundation.org', emailVerifiedAt: null }
const external = { email: 'ada@gmail.com', emailVerifiedAt: new Date('2026-01-01') }

describe('emailDomain', () => {
  it('reads the domain, case-insensitively', () => {
    expect(emailDomain('Ada.Bello@FradFoundation.ORG')).toBe('fradfoundation.org')
  })

  it('rejects an address with more than one @', () => {
    expect(emailDomain('a@b@fradfoundation.org')).toBeNull()
  })

  it('rejects a domain with no dot', () => {
    expect(emailDomain('ada@localhost')).toBeNull()
  })

  it('rejects an empty local part', () => {
    expect(emailDomain('@fradfoundation.org')).toBeNull()
  })
})

describe('isInternalEmail — spoofing resistance', () => {
  it('accepts the organisation domain', () => {
    expect(isInternalEmail('ada@fradfoundation.org')).toBe(true)
    expect(isInternalEmail('  Ada@FRADFOUNDATION.org  ')).toBe(true)
  })

  it('rejects a lookalike domain', () => {
    expect(isInternalEmail('ada@not-fradfoundation.org')).toBe(false)
    expect(isInternalEmail('ada@fradfoundation.org.attacker.com')).toBe(false)
    expect(isInternalEmail('ada@fradfoundation.com')).toBe(false)
    expect(isInternalEmail('ada@fradfoundationorg.com')).toBe(false)
  })

  it('rejects an unlisted subdomain', () => {
    // Subdomains must be listed explicitly rather than inherited.
    expect(isInternalEmail('ada@ng.fradfoundation.org')).toBe(false)
  })

  it('rejects the domain appearing only in the local part', () => {
    expect(isInternalEmail('fradfoundation.org@gmail.com')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isInternalEmail('')).toBe(false)
    expect(isInternalEmail(null)).toBe(false)
  })
})

describe('isInternalCandidate — verification is required', () => {
  it('accepts a verified staff address', () => {
    expect(isInternalCandidate(verified)).toBe(true)
  })

  it('rejects an unverified staff address', () => {
    // Otherwise anyone could claim staff status by typing the domain.
    expect(isInternalCandidate(unverified)).toBe(false)
  })

  it('rejects a verified external address', () => {
    expect(isInternalCandidate(external)).toBe(false)
  })

  it('rejects an anonymous visitor', () => {
    expect(isInternalCandidate(null)).toBe(false)
  })
})

describe('visibleAudiencesFor — §28.8', () => {
  it('shows internal roles to verified staff', () => {
    expect(visibleAudiencesFor(verified)).toEqual(['PUBLIC', 'INTERNAL', 'BOTH'])
  })

  it('hides internal roles from everyone else', () => {
    expect(visibleAudiencesFor(external)).toEqual(['PUBLIC', 'BOTH'])
    expect(visibleAudiencesFor(unverified)).toEqual(['PUBLIC', 'BOTH'])
    expect(visibleAudiencesFor(null)).toEqual(['PUBLIC', 'BOTH'])
  })
})

describe('internalApplicationBlockReason', () => {
  it('never blocks a public or dual-audience vacancy', () => {
    expect(internalApplicationBlockReason('PUBLIC', external)).toBeNull()
    expect(internalApplicationBlockReason('BOTH', external)).toBeNull()
  })

  it('allows verified staff into an internal vacancy', () => {
    expect(internalApplicationBlockReason('INTERNAL', verified)).toBeNull()
  })

  it('blocks an external candidate', () => {
    expect(internalApplicationBlockReason('INTERNAL', external)).toBe('This vacancy is open to current staff only')
  })

  it('tells staff with an unverified address what to do', () => {
    expect(internalApplicationBlockReason('INTERNAL', unverified)).toBe(
      'Verify your work email address before applying for an internal vacancy'
    )
  })

  it('blocks an anonymous applicant', () => {
    expect(internalApplicationBlockReason('INTERNAL', null)).toBe('This vacancy is open to current staff only')
  })
})
