import { describe, expect, it } from 'vitest'
import {
  assessEmergencyControls,
  buildComplianceReview,
  validateEmergencyAdvertPeriod,
  serviceHoursFor,
  stageDueAt,
  MINIMUM_EMERGENCY_ADVERT_HOURS,
} from '@/lib/emergency-recruitment'

const clearControls = {
  backgroundChecks: [
    { checkType: 'IDENTITY', status: 'CLEARED' },
    { checkType: 'SAFEGUARDING', status: 'CLEARED' },
  ],
  referenceOutcomes: ['SATISFACTORY'],
  fundingConfirmed: true,
  offerApproved: true,
}

describe('emergency service standards — §28.7', () => {
  it('is faster than the standard route at every stage', () => {
    for (const stage of ['VACANCY_APPROVAL', 'LONGLISTING', 'SHORTLISTING', 'OFFER_APPROVAL']) {
      expect(serviceHoursFor(stage, true)!).toBeLessThan(serviceHoursFor(stage, false)!)
    }
  })

  it('returns null for a stage with no configured target', () => {
    expect(serviceHoursFor('NOT_A_STAGE', true)).toBeNull()
  })

  it('computes a due date from the applicable route', () => {
    const from = new Date('2026-08-06T00:00:00.000Z')
    const emergency = stageDueAt('VACANCY_APPROVAL', true, from)!
    const standard = stageDueAt('VACANCY_APPROVAL', false, from)!
    expect(emergency.getTime()).toBeLessThan(standard.getTime())
  })
})

describe('advertising floor — §28.7', () => {
  it('rejects a window below the minimum', () => {
    const opening = new Date('2026-08-06T00:00:00.000Z')
    const closing = new Date('2026-08-06T06:00:00.000Z')
    expect(validateEmergencyAdvertPeriod(opening, closing)).toContain('at least')
  })

  it('accepts a window at the minimum', () => {
    const opening = new Date('2026-08-06T00:00:00.000Z')
    const closing = new Date(opening.getTime() + MINIMUM_EMERGENCY_ADVERT_HOURS * 3_600_000)
    expect(validateEmergencyAdvertPeriod(opening, closing)).toBeNull()
  })
})

describe('non-waivable controls — §28.7', () => {
  it('clears when identity, safeguarding, references, funding and approval are all done', () => {
    const result = assessEmergencyControls(clearControls)
    expect(result.clear).toBe(true)
    expect(result.outstanding).toEqual([])
  })

  it('does not clear when safeguarding is outstanding', () => {
    const result = assessEmergencyControls({
      ...clearControls,
      backgroundChecks: [{ checkType: 'IDENTITY', status: 'CLEARED' }],
    })
    expect(result.clear).toBe(false)
    expect(result.outstanding).toContain('SAFEGUARDING')
  })

  it('does not accept an unsatisfactory reference as a satisfied control', () => {
    const result = assessEmergencyControls({ ...clearControls, referenceOutcomes: ['UNSATISFACTORY'] })
    expect(result.outstanding).toContain('REFERENCES')
  })

  it('does not clear without funding confirmation, however urgent', () => {
    const result = assessEmergencyControls({ ...clearControls, fundingConfirmed: false })
    expect(result.outstanding).toContain('FUNDING_CONFIRMATION')
  })

  it('accepts an explicitly waived check but not a missing one', () => {
    const waived = assessEmergencyControls({
      ...clearControls,
      backgroundChecks: [
        { checkType: 'IDENTITY', status: 'CLEARED' },
        { checkType: 'SAFEGUARDING', status: 'WAIVED' },
      ],
    })
    expect(waived.clear).toBe(true)

    const pending = assessEmergencyControls({
      ...clearControls,
      backgroundChecks: [
        { checkType: 'IDENTITY', status: 'CLEARED' },
        { checkType: 'SAFEGUARDING', status: 'IN_PROGRESS' },
      ],
    })
    expect(pending.clear).toBe(false)
  })
})

describe('post-recruitment compliance review — §28.7', () => {
  const base = {
    vacancyReference: 'FRAD-VAC-2026-ABC',
    emergencyJustification: 'Sudden displacement influx requiring immediate health staffing.',
    approvedBy: 'user-1',
    approvedAt: new Date('2026-08-01'),
    advertHours: 48,
    usedRoster: true,
    usedPreApprovedJobDescription: true,
    usedPreApprovedAssessment: true,
    controls: assessEmergencyControls(clearControls),
    timeToOfferHours: 96,
  }

  it('reports compliant when controls held and accelerations were used', () => {
    const review = buildComplianceReview(base)
    expect(review.outcome).toBe('COMPLIANT')
    expect(review.findings).toEqual([])
    expect(review.accelerations.length).toBeGreaterThan(0)
  })

  it('raises a finding when the justification is missing', () => {
    const review = buildComplianceReview({ ...base, emergencyJustification: null })
    expect(review.outcome).toBe('FINDINGS_RAISED')
  })

  it('raises a finding when the classification was never approved', () => {
    const review = buildComplianceReview({ ...base, approvedBy: null })
    expect(review.outcome).toBe('FINDINGS_RAISED')
  })

  it('raises a finding for each outstanding control', () => {
    const review = buildComplianceReview({
      ...base,
      controls: assessEmergencyControls({ ...clearControls, referenceOutcomes: [] }),
    })
    expect(review.findings.some((finding) => finding.includes('reference'))).toBe(true)
  })

  it('flags an emergency classification that used no accelerations at all', () => {
    const review = buildComplianceReview({
      ...base,
      advertHours: 336,
      usedRoster: false,
      usedPreApprovedJobDescription: false,
      usedPreApprovedAssessment: false,
    })
    expect(review.findings.some((finding) => finding.includes('no accelerated provisions'))).toBe(true)
  })
})
