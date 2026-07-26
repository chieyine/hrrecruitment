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

  it('treats them as terminal', () => {
    expect(allowedApplicationTransitions('OFFER_DECLINED')).toEqual([])
    expect(canTransitionApplication('OFFER_DECLINED', 'OFFER_SENT')).toBe(false)
    expect(canTransitionApplication('OFFER_EXPIRED', 'PREBOARDING')).toBe(false)
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
