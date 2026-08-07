import { describe, expect, it } from 'vitest'
import { candidateFacingStatus, candidateStatusGuidance, candidateStatusLabel } from '@/lib/candidate-status'

describe('candidate status guidance', () => {
  it('explains every application workflow state without using the generic fallback', () => {
    const statuses = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'LONGLISTED',
      'SHORTLISTED',
      'ASSESSMENT_INVITED',
      'ASSESSMENT_COMPLETED',
      'INTERVIEW_INVITED',
      'INTERVIEW_COMPLETED',
      'REFERENCE_CHECK',
      'RECOMMENDED',
      'RESERVE',
      'OFFER_DRAFT',
      'OFFER_SENT',
      'OFFER_ACCEPTED',
      'PREBOARDING',
      'READY_TO_RESUME',
      'RESUMED',
      'TRANSFERRED_TO_ERP',
      'NOT_SELECTED',
      'INELIGIBLE',
      'WITHDRAWN',
      'CANCELLED',
      // End_to_End.md §21.2 additions the candidate can actually see.
      'INCOMPLETE',
      'CONDITIONAL_OFFER',
    ]
    for (const status of statuses) {
      expect(candidateStatusGuidance(status).meaning).not.toContain('progressing through')
    }
  })

  it('labels the new §21.2 candidate-facing statuses', () => {
    expect(candidateStatusLabel('INCOMPLETE')).toBe('Incomplete')
    expect(candidateStatusLabel('CONDITIONAL_OFFER')).toBe('Conditional offer')
  })

  it('uses safe guidance for an unknown future state', () => {
    expect(candidateStatusGuidance('FUTURE_STATE').action).toContain('Monitor')
  })

  it('never presents an internal draft as submitted when visible status is stale', () => {
    const status = candidateFacingStatus('DRAFT', 'APPLICATION_RECEIVED')

    expect(status).toBe('APPLICATION_DRAFT')
    expect(candidateStatusLabel(status)).toBe('Draft')
  })

  it('uses the candidate-visible status after submission', () => {
    expect(candidateFacingStatus('SUBMITTED', 'APPLICATION_RECEIVED')).toBe('APPLICATION_RECEIVED')
  })

  it('does not trust legacy display values that expose internal deliberation', () => {
    expect(candidateFacingStatus('REFERENCE_CHECK', 'REFERENCE_CHECK')).toBe('UNDER_REVIEW')
    expect(candidateFacingStatus('RECOMMENDED', 'RECOMMENDED')).toBe('UNDER_REVIEW')
    expect(candidateFacingStatus('NOT_LONGLISTED', 'NOT_LONGLISTED')).toBe('UNSUCCESSFUL')
    expect(candidateFacingStatus('TRANSFERRED_TO_ERP', 'TRANSFERRED_TO_ERP')).toBe('RECRUITMENT_COMPLETED')
  })
})
