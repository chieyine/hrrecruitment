import { describe, it, expect } from 'vitest'
import {
  canTransitionApplication,
  canTransitionVacancy,
  allowedApplicationTransitions,
  isKnownApplicationStatus,
} from '@/lib/state-machine'

describe('terminal offer outcomes', () => {
  it('recognises the statuses OFFER_SENT can move into', () => {
    // OFFER_SENT declares these as targets, so they must exist as keys.
    expect(allowedApplicationTransitions('OFFER_SENT')).toContain('OFFER_DECLINED')
    expect(allowedApplicationTransitions('OFFER_SENT')).toContain('OFFER_EXPIRED')
    expect(isKnownApplicationStatus('OFFER_DECLINED')).toBe(true)
    expect(isKnownApplicationStatus('OFFER_EXPIRED')).toBe(true)
  })

  it('treats them as final outcomes that can only be archived', () => {
    // End_to_End.md §21.2 adds Archived as a candidate status. A closed outcome
    // may be archived for retention, but it must never re-enter the pipeline.
    expect(allowedApplicationTransitions('OFFER_DECLINED')).toEqual(['ARCHIVED'])
    expect(canTransitionApplication('OFFER_DECLINED', 'OFFER_SENT')).toBe(false)
    expect(canTransitionApplication('OFFER_EXPIRED', 'PREBOARDING')).toBe(false)
    expect(canTransitionApplication('OFFER_DECLINED', 'ARCHIVED')).toBe(true)
  })

  it('makes ARCHIVED genuinely final', () => {
    expect(allowedApplicationTransitions('ARCHIVED')).toEqual([])
    expect(canTransitionApplication('ARCHIVED', 'SUBMITTED')).toBe(false)
  })
})

describe('End_to_End.md §21.2 statuses', () => {
  it('routes an unclear application through exception review', () => {
    expect(canTransitionApplication('SUBMITTED', 'EXCEPTION_REVIEW')).toBe(true)
    expect(canTransitionApplication('EXCEPTION_REVIEW', 'LONGLISTED')).toBe(true)
    expect(canTransitionApplication('EXCEPTION_REVIEW', 'NOT_LONGLISTED')).toBe(true)
  })

  it('places due diligence between references and the offer', () => {
    expect(canTransitionApplication('REFERENCE_CHECK', 'BACKGROUND_CHECK')).toBe(true)
    expect(canTransitionApplication('BACKGROUND_CHECK', 'RECOMMENDED')).toBe(true)
  })

  it('gates ERP transfer behind an explicit ready state', () => {
    expect(canTransitionApplication('RESUMED', 'READY_FOR_ERP_TRANSFER')).toBe(true)
    expect(canTransitionApplication('READY_FOR_ERP_TRANSFER', 'TRANSFERRED_TO_ERP')).toBe(true)
  })

  it('does not allow a rejected applicant to be revived', () => {
    expect(canTransitionApplication('NOT_LONGLISTED', 'LONGLISTED')).toBe(false)
    expect(canTransitionApplication('NOT_SHORTLISTED', 'SHORTLISTED')).toBe(false)
  })
})

describe('End_to_End.md §21.1 vacancy stages', () => {
  it('tracks the vacancy through each recruitment stage', () => {
    expect(canTransitionVacancy('CLOSED', 'LONGLISTING')).toBe(true)
    expect(canTransitionVacancy('LONGLISTING', 'SHORTLISTING')).toBe(true)
    expect(canTransitionVacancy('INTERVIEW', 'DUE_DILIGENCE')).toBe(true)
    expect(canTransitionVacancy('OFFER', 'FILLED')).toBe(true)
  })

  it('allows a vacancy to be returned for correction', () => {
    expect(canTransitionVacancy('PENDING_APPROVAL', 'RETURNED_FOR_CORRECTION')).toBe(true)
    expect(canTransitionVacancy('RETURNED_FOR_CORRECTION', 'PENDING_APPROVAL')).toBe(true)
  })

  it('still refuses to publish an unapproved draft', () => {
    expect(canTransitionVacancy('DRAFT', 'OPEN')).toBe(false)
  })
})

describe('unknown statuses fail closed', () => {
  it('does not accept an unrecognised source status as an idempotent no-op', () => {
    expect(isKnownApplicationStatus('TYPO_STATUS')).toBe(false)
    expect(canTransitionApplication('TYPO_STATUS', 'TYPO_STATUS')).toBe(false)
    expect(canTransitionVacancy('TYPO_STATUS', 'TYPO_STATUS')).toBe(false)
  })

  it('still accepts a genuine same-status write', () => {
    expect(canTransitionApplication('UNDER_REVIEW', 'UNDER_REVIEW')).toBe(true)
    expect(canTransitionVacancy('OPEN', 'OPEN')).toBe(true)
  })
})
