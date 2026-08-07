import { describe, expect, it } from 'vitest'
import {
  parseAnonymisationPolicy,
  applyAnonymisation,
  candidateAlias,
  redactFreeText,
  stageAllowsAnonymisation,
  DEFAULT_ANONYMISED_FIELDS,
} from '@/lib/anonymisation'

const candidate = {
  id: 'cand-1',
  legalFirstName: 'Aminu',
  middleName: 'Ibrahim',
  lastName: 'Bello',
  preferredName: 'Aminu',
  nationality: 'Nigerian',
  address: '12 Wuse 2',
  city: 'Abuja',
  state: 'FCT',
  lga: 'AMAC',
  countryOfResidence: 'Nigeria',
  primaryPhone: '+2348035551234',
  alternatePhone: null,
  user: { email: 'aminu@example.com' },
}

const context = { applicationId: 'app-1', applicationReference: 'FRAD-APP-001' }

describe('parseAnonymisationPolicy', () => {
  it('is disabled when the vacancy has anonymised review off', () => {
    const policy = parseAnonymisationPolicy({ anonymisedReview: false, anonymisedFieldsJson: '["NAME"]' })
    expect(policy.enabled).toBe(false)
  })

  it('reads the configured field list', () => {
    const policy = parseAnonymisationPolicy({ anonymisedReview: true, anonymisedFieldsJson: '["NAME","AGE"]' })
    expect(policy.hidden.has('NAME')).toBe(true)
    expect(policy.hidden.has('NATIONALITY')).toBe(false)
  })

  it('fails closed to the defaults when the list is unreadable', () => {
    // An enabled policy with a corrupt list must hide more, never less.
    const policy = parseAnonymisationPolicy({ anonymisedReview: true, anonymisedFieldsJson: 'not json' })
    expect(policy.enabled).toBe(true)
    expect(policy.hidden.has('NAME')).toBe(true)
    expect(policy.hidden.size).toBe(DEFAULT_ANONYMISED_FIELDS.length)
  })

  it('fails closed when the list is empty', () => {
    const policy = parseAnonymisationPolicy({ anonymisedReview: true, anonymisedFieldsJson: '[]' })
    expect(policy.hidden.has('NAME')).toBe(true)
  })
})

describe('applyAnonymisation', () => {
  const policy = parseAnonymisationPolicy({
    anonymisedReview: true,
    anonymisedFieldsJson: JSON.stringify(DEFAULT_ANONYMISED_FIELDS),
  })

  it('removes the name and supplies an alias', () => {
    const result = applyAnonymisation(candidate, policy, context)
    expect(result.legalFirstName).toBe('')
    expect(result.lastName).toBe('')
    expect(result.alias).toBe(candidateAlias('app-1', 'FRAD-APP-001'))
    expect(result.anonymised).toBe(true)
  })

  it('removes contact details and nationality', () => {
    const result = applyAnonymisation(candidate, policy, context)
    expect(result.user).toBeNull()
    expect(result.primaryPhone).toBeNull()
    expect(result.nationality).toBeNull()
    expect(result.address).toBeNull()
  })

  it('passes the record through untouched when the policy is off', () => {
    const off = parseAnonymisationPolicy({ anonymisedReview: false, anonymisedFieldsJson: '[]' })
    const result = applyAnonymisation(candidate, off, context)
    expect(result.legalFirstName).toBe('Aminu')
    expect(result.alias).toBeNull()
    expect(result.anonymised).toBe(false)
  })

  it('keeps a field the vacancy chose not to hide', () => {
    const partial = parseAnonymisationPolicy({ anonymisedReview: true, anonymisedFieldsJson: '["NAME"]' })
    const result = applyAnonymisation(candidate, partial, context)
    expect(result.legalFirstName).toBe('')
    expect(result.nationality).toBe('Nigerian')
  })
})

describe('candidateAlias', () => {
  it('is stable for the same application', () => {
    expect(candidateAlias('app-1', 'FRAD-APP-001')).toBe(candidateAlias('app-1', 'FRAD-APP-001'))
  })

  it('differs between applications', () => {
    expect(candidateAlias('app-1', 'FRAD-APP-001')).not.toBe(candidateAlias('app-2', 'FRAD-APP-002'))
  })
})

describe('redactFreeText', () => {
  const policy = parseAnonymisationPolicy({
    anonymisedReview: true,
    anonymisedFieldsJson: JSON.stringify(DEFAULT_ANONYMISED_FIELDS),
  })

  it('removes the candidate name from a motivation statement', () => {
    const text = 'My name is Aminu Bello and I have worked in Borno.'
    const result = redactFreeText(text, candidate, policy)
    expect(result).not.toContain('Aminu')
    expect(result).not.toContain('Bello')
  })

  it('removes an email address that leaks identity', () => {
    const result = redactFreeText('Reach me at aminu@example.com', candidate, policy)
    expect(result).not.toContain('aminu@example.com')
  })

  it('leaves text untouched when the policy is off', () => {
    const off = parseAnonymisationPolicy({ anonymisedReview: false, anonymisedFieldsJson: '[]' })
    expect(redactFreeText('Aminu Bello', candidate, off)).toBe('Aminu Bello')
  })

  it('handles null input', () => {
    expect(redactFreeText(null, candidate, policy)).toBeNull()
  })
})

describe('stageAllowsAnonymisation — §28.3 applies to early review only', () => {
  it('applies during screening and shortlisting', () => {
    expect(stageAllowsAnonymisation('SUBMITTED')).toBe(true)
    expect(stageAllowsAnonymisation('EXCEPTION_REVIEW')).toBe(true)
    expect(stageAllowsAnonymisation('SHORTLISTED')).toBe(true)
  })

  it('stops once identity is unavoidable', () => {
    expect(stageAllowsAnonymisation('INTERVIEW_INVITED')).toBe(false)
    expect(stageAllowsAnonymisation('REFERENCE_CHECK')).toBe(false)
    expect(stageAllowsAnonymisation('OFFER_SENT')).toBe(false)
  })
})
