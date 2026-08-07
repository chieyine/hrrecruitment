import { describe, expect, it } from 'vitest'
import {
  evaluateRule,
  evaluateLonglist,
  mergedYears,
  qualificationRank,
  overrideRequiresEvidence,
  overrideRequiresApproval,
  type LonglistCandidateFacts,
  type LonglistRule,
} from '@/lib/longlisting-rules'

const NOW = new Date('2026-08-06T00:00:00.000Z')

function facts(overrides: Partial<LonglistCandidateFacts> = {}): LonglistCandidateFacts {
  return {
    education: [],
    employment: [],
    licences: [],
    certifications: [],
    skills: [],
    languages: [],
    answers: new Map(),
    documents: new Set(),
    earliestStartDate: null,
    willingnessToRelocate: false,
    preferredDutyLocations: [],
    workAuthorisation: null,
    ...overrides,
  }
}

function rule(overrides: Partial<LonglistRule> = {}): LonglistRule {
  return {
    id: 'rule-1',
    ruleType: 'MINIMUM_EXPERIENCE',
    classification: 'MANDATORY_KNOCKOUT',
    label: 'Test rule',
    field: null,
    operator: 'GTE',
    expected: 3,
    failureMessage: 'Not met',
    weight: 0,
    ...overrides,
  }
}

describe('mergedYears', () => {
  it('does not double-count overlapping employment', () => {
    // Two concurrent three-year roles are three years of experience, not six.
    const years = mergedYears(
      [
        { startDate: new Date('2020-01-01'), endDate: new Date('2023-01-01') },
        { startDate: new Date('2021-01-01'), endDate: new Date('2023-01-01') },
      ],
      NOW
    )
    expect(years).toBeGreaterThan(2.9)
    expect(years).toBeLessThan(3.1)
  })

  it('treats a null end date as ongoing up to now', () => {
    const years = mergedYears([{ startDate: new Date('2024-08-06'), endDate: null }], NOW)
    expect(years).toBeGreaterThan(1.9)
    expect(years).toBeLessThan(2.1)
  })

  it('ignores ranges that end before they start', () => {
    expect(mergedYears([{ startDate: new Date('2025-01-01'), endDate: new Date('2020-01-01') }], NOW)).toBe(0)
  })
})

describe('qualificationRank', () => {
  it('ranks a masters above a bachelors above a diploma', () => {
    expect(qualificationRank('MSc Public Health')!).toBeGreaterThan(qualificationRank('BSc Nursing')!)
    expect(qualificationRank('BSc Nursing')!).toBeGreaterThan(qualificationRank('National Diploma')!)
  })

  it('returns null for an unrecognised qualification so a human decides', () => {
    expect(qualificationRank('Certificat de Compétence')).toBeNull()
  })
})

describe('evaluateRule — §11.3 outcomes', () => {
  it('marks a met minimum-experience rule as MET', () => {
    const result = evaluateRule(
      rule({ expected: 3 }),
      facts({ employment: [{ employer: 'A', jobTitle: 'Officer', employmentType: 'FULL_TIME', startDate: new Date('2020-01-01'), endDate: null, responsibilities: null }] }),
      NOW
    )
    expect(result.outcome).toBe('MET')
  })

  it('marks an unmet minimum-experience rule as NOT_MET', () => {
    const result = evaluateRule(
      rule({ expected: 10 }),
      facts({ employment: [{ employer: 'A', jobTitle: 'Officer', employmentType: 'FULL_TIME', startDate: new Date('2024-01-01'), endDate: null, responsibilities: null }] }),
      NOW
    )
    expect(result.outcome).toBe('NOT_MET')
  })

  it('returns UNCLEAR for an unrecognised qualification rather than rejecting', () => {
    const result = evaluateRule(
      rule({ ruleType: 'MINIMUM_QUALIFICATION', expected: 'BSc' }),
      facts({ education: [{ qualification: 'Licence Professionnelle', fieldOfStudy: 'Health', completionYear: 2018 }] }),
      NOW
    )
    expect(result.outcome).toBe('UNCLEAR')
  })

  it('accepts a higher qualification than the one required', () => {
    const result = evaluateRule(
      rule({ ruleType: 'MINIMUM_QUALIFICATION', expected: 'BSc' }),
      facts({ education: [{ qualification: 'PhD Epidemiology', fieldOfStudy: 'Health', completionYear: 2020 }] }),
      NOW
    )
    expect(result.outcome).toBe('MET')
  })

  it('treats an unverified licence as UNCLEAR, not a failure', () => {
    const result = evaluateRule(
      rule({ ruleType: 'REQUIRED_LICENCE', expected: ['MDCN Medical'] }),
      facts({
        licences: [
          { professionalBody: 'MDCN', licenceType: 'Medical', verificationStatus: 'UNVERIFIED', expiryDate: null },
        ],
      }),
      NOW
    )
    expect(result.outcome).toBe('UNCLEAR')
  })

  it('rejects an expired licence', () => {
    const result = evaluateRule(
      rule({ ruleType: 'REQUIRED_LICENCE', expected: ['MDCN Medical'] }),
      facts({
        licences: [
          {
            professionalBody: 'MDCN',
            licenceType: 'Medical',
            verificationStatus: 'VERIFIED',
            expiryDate: new Date('2020-01-01'),
          },
        ],
      }),
      NOW
    )
    expect(result.outcome).toBe('NOT_MET')
  })

  it('accepts a duty station when the candidate will relocate anywhere', () => {
    const result = evaluateRule(
      rule({ ruleType: 'DUTY_STATION_ACCEPTANCE', expected: 'Maiduguri' }),
      facts({ willingnessToRelocate: true }),
      NOW
    )
    expect(result.outcome).toBe('MET')
  })

  it('is UNCLEAR when the candidate stated no location preference at all', () => {
    const result = evaluateRule(
      rule({ ruleType: 'DUTY_STATION_ACCEPTANCE', expected: 'Maiduguri' }),
      facts({ willingnessToRelocate: false, preferredDutyLocations: [] }),
      NOW
    )
    expect(result.outcome).toBe('UNCLEAR')
  })

  it('checks a required language against the configured minimum level', () => {
    const met = evaluateRule(
      rule({ ruleType: 'REQUIRED_LANGUAGE', expected: ['Hausa'], field: 'FLUENT' }),
      facts({ languages: [{ language: 'Hausa', speakingLevel: 'FLUENT', readingLevel: 'BASIC', writingLevel: 'BASIC' }] }),
      NOW
    )
    expect(met.outcome).toBe('MET')

    const notMet = evaluateRule(
      rule({ ruleType: 'REQUIRED_LANGUAGE', expected: ['Hausa'], field: 'NATIVE' }),
      facts({ languages: [{ language: 'Hausa', speakingLevel: 'BASIC', readingLevel: 'BASIC', writingLevel: 'BASIC' }] }),
      NOW
    )
    expect(notMet.outcome).toBe('NOT_MET')
  })

  it('detects a missing mandatory document', () => {
    const result = evaluateRule(
      rule({ ruleType: 'MANDATORY_DOCUMENT', expected: ['cv'] }),
      facts({ documents: new Set(['PASSPORT_PHOTO']) }),
      NOW
    )
    expect(result.outcome).toBe('NOT_MET')
  })

  it('detects an unanswered mandatory question', () => {
    const result = evaluateRule(
      rule({ ruleType: 'MANDATORY_QUESTION', field: 'q1', expected: null }),
      facts({ answers: new Map([['q1', '   ']]) }),
      NOW
    )
    expect(result.outcome).toBe('NOT_MET')
  })

  it('rejects availability after the required date', () => {
    const result = evaluateRule(
      rule({ ruleType: 'AVAILABILITY_BEFORE', expected: '2026-09-01' }),
      facts({ earliestStartDate: new Date('2026-12-01') }),
      NOW
    )
    expect(result.outcome).toBe('NOT_MET')
  })

  it('returns UNCLEAR for an unknown rule type instead of silently passing', () => {
    const result = evaluateRule(rule({ ruleType: 'SOMETHING_NEW' }), facts(), NOW)
    expect(result.outcome).toBe('UNCLEAR')
  })
})

describe('evaluateLonglist — §11.3 placement', () => {
  const experienced = facts({
    employment: [
      {
        employer: 'Oxfam',
        jobTitle: 'Programme Officer',
        employmentType: 'FULL_TIME',
        startDate: new Date('2018-01-01'),
        endDate: null,
        responsibilities: null,
      },
    ],
    education: [{ qualification: 'BSc Public Health', fieldOfStudy: 'Public Health', completionYear: 2017 }],
  })

  it('places a clean pass in the automatically eligible group', () => {
    const decision = evaluateLonglist([rule({ expected: 3 })], experienced, NOW)
    expect(decision.outcome).toBe('AUTOMATICALLY_ELIGIBLE')
  })

  it('a failed knockout is fatal regardless of other passes', () => {
    const decision = evaluateLonglist(
      [
        rule({ id: 'pass', expected: 3 }),
        rule({ id: 'fail', ruleType: 'MANDATORY_DOCUMENT', expected: ['nysc'] }),
      ],
      experienced,
      NOW
    )
    expect(decision.outcome).toBe('AUTOMATICALLY_INELIGIBLE')
    expect(decision.decidingRuleId).toBe('fail')
  })

  it('an unclear knockout routes to human review', () => {
    const decision = evaluateLonglist(
      [rule({ id: 'unclear', ruleType: 'DUTY_STATION_ACCEPTANCE', expected: 'Maiduguri' })],
      experienced,
      NOW
    )
    expect(decision.outcome).toBe('REQUIRES_REVIEW')
    expect(decision.decidingRuleId).toBe('unclear')
  })

  it('a failed knockout outranks an unclear one', () => {
    const decision = evaluateLonglist(
      [
        rule({ id: 'unclear', ruleType: 'DUTY_STATION_ACCEPTANCE', expected: 'Maiduguri' }),
        rule({ id: 'fail', ruleType: 'MANDATORY_DOCUMENT', expected: ['nysc'] }),
      ],
      experienced,
      NOW
    )
    expect(decision.outcome).toBe('AUTOMATICALLY_INELIGIBLE')
    expect(decision.decidingRuleId).toBe('fail')
  })

  it('preferred and informational failures never change the outcome', () => {
    const decision = evaluateLonglist(
      [
        rule({ id: 'knockout', expected: 3 }),
        rule({
          id: 'preferred',
          classification: 'PREFERRED',
          ruleType: 'MANDATORY_DOCUMENT',
          expected: ['portfolio'],
        }),
        rule({
          id: 'info',
          classification: 'INFORMATIONAL',
          ruleType: 'MANDATORY_DOCUMENT',
          expected: ['reference-letter'],
        }),
      ],
      experienced,
      NOW
    )
    expect(decision.outcome).toBe('AUTOMATICALLY_ELIGIBLE')
  })

  it('computes the §11.3 eligibility score from scored rules only', () => {
    const decision = evaluateLonglist(
      [
        rule({ id: 'knockout', expected: 3 }),
        rule({ id: 'scored-pass', classification: 'SCORED', weight: 30, expected: 3 }),
        rule({
          id: 'scored-fail',
          classification: 'SCORED',
          weight: 20,
          ruleType: 'MANDATORY_DOCUMENT',
          expected: ['portfolio'],
        }),
      ],
      experienced,
      NOW
    )
    expect(decision.eligibilityScore).toBe(30)
    expect(decision.maximumScore).toBe(50)
    expect(decision.outcome).toBe('AUTOMATICALLY_ELIGIBLE')
  })

  it('reports no score when no scored rules are configured', () => {
    const decision = evaluateLonglist([rule({ expected: 3 })], experienced, NOW)
    expect(decision.eligibilityScore).toBeNull()
    expect(decision.maximumScore).toBeNull()
  })

  it('sends an application to review when no mandatory rule exists to decide it', () => {
    const decision = evaluateLonglist(
      [rule({ id: 'only-preferred', classification: 'PREFERRED', expected: 3 })],
      experienced,
      NOW
    )
    expect(decision.outcome).toBe('REQUIRES_REVIEW')
  })

  it('an empty rule set cannot automatically eligible anyone', () => {
    expect(evaluateLonglist([], experienced, NOW).outcome).toBe('REQUIRES_REVIEW')
  })
})

describe('override controls — §11.6', () => {
  it('requires evidence for equivalence claims', () => {
    expect(overrideRequiresEvidence('EQUIVALENT_QUALIFICATION')).toBe(true)
    expect(overrideRequiresEvidence('DATA_ENTRY_CORRECTION')).toBe(false)
  })

  it('requires approval for policy exceptions', () => {
    expect(overrideRequiresApproval('APPROVED_POLICY_EXCEPTION')).toBe(true)
    expect(overrideRequiresApproval('SYSTEM_PARSING_ERROR')).toBe(false)
  })
})
