import { describe, it, expect } from 'vitest'
import {
  canTransitionApplication,
  canTransitionVacancy,
  allowedApplicationTransitions,
  candidateVisibleStatusForInternal,
} from '@/lib/state-machine'

describe('application state machine', () => {
  it('allows valid forward transitions', () => {
    expect(canTransitionApplication('DRAFT', 'SUBMITTED')).toBe(true)
    expect(canTransitionApplication('SUBMITTED', 'UNDER_REVIEW')).toBe(true)
    expect(canTransitionApplication('RECOMMENDED', 'OFFER_DRAFT')).toBe(true)
    expect(canTransitionApplication('RESUMED', 'TRANSFERRED_TO_ERP')).toBe(true)
  })

  it('rejects arbitrary jumps', () => {
    expect(canTransitionApplication('SUBMITTED', 'OFFER_SENT')).toBe(false)
    expect(canTransitionApplication('DRAFT', 'TRANSFERRED_TO_ERP')).toBe(false)
    expect(canTransitionApplication('TRANSFERRED_TO_ERP', 'SUBMITTED')).toBe(false)
  })

  it('treats same-status as allowed (idempotent)', () => {
    expect(canTransitionApplication('UNDER_REVIEW', 'UNDER_REVIEW')).toBe(true)
  })

  it('exposes the allowed set', () => {
    expect(allowedApplicationTransitions('SUBMITTED')).toContain('UNDER_REVIEW')
    expect(allowedApplicationTransitions('TRANSFERRED_TO_ERP')).toEqual([])
  })

  it('derives candidate-visible status on the server', () => {
    expect(candidateVisibleStatusForInternal('LONGLISTED')).toBe('UNDER_REVIEW')
    expect(candidateVisibleStatusForInternal('SHORTLISTED')).toBe('SHORTLISTED')
    expect(candidateVisibleStatusForInternal('INELIGIBLE')).toBe('UNSUCCESSFUL')
  })
})

describe('vacancy state machine', () => {
  it('allows valid transitions', () => {
    // Publishing requires approval: DRAFT → PENDING_APPROVAL → OPEN.
    expect(canTransitionVacancy('DRAFT', 'PENDING_APPROVAL')).toBe(true)
    expect(canTransitionVacancy('DRAFT', 'OPEN')).toBe(false)
    expect(canTransitionVacancy('PENDING_APPROVAL', 'OPEN')).toBe(true)
    expect(canTransitionVacancy('OPEN', 'CLOSED')).toBe(true)
    expect(canTransitionVacancy('CLOSED', 'COMPLETED')).toBe(true)
  })
  it('rejects invalid transitions', () => {
    expect(canTransitionVacancy('DRAFT', 'COMPLETED')).toBe(false)
    expect(canTransitionVacancy('ARCHIVED', 'OPEN')).toBe(false)
  })
})
