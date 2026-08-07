import { describe, expect, it } from 'vitest'
import {
  canTransitionStaffingRequest,
  allowedStaffingRequestTransitions,
  isOpenStaffingRequest,
  canCreateVacancyFrom,
  requiresExecutiveApproval,
  executiveApprovalReason,
  STAFFING_REQUEST_STATUSES,
} from '@/lib/staffing-request'

const base = { jobGrade: 'C3', urgency: 'STANDARD', isReplacement: true, numberOfPositions: 1 }

describe('staffing request lifecycle — §5.2', () => {
  it('follows the documented order: submit, fund, HR review', () => {
    expect(canTransitionStaffingRequest('DRAFT', 'SUBMITTED')).toBe(true)
    expect(canTransitionStaffingRequest('SUBMITTED', 'AWAITING_FUNDING_CONFIRMATION')).toBe(true)
    expect(canTransitionStaffingRequest('AWAITING_FUNDING_CONFIRMATION', 'FUNDING_CONFIRMED')).toBe(true)
    expect(canTransitionStaffingRequest('FUNDING_CONFIRMED', 'AWAITING_HR_REVIEW')).toBe(true)
    expect(canTransitionStaffingRequest('AWAITING_HR_REVIEW', 'HR_APPROVED')).toBe(true)
    expect(canTransitionStaffingRequest('HR_APPROVED', 'APPROVED_FOR_VACANCY')).toBe(true)
  })

  it('will not let a request skip the funding stage', () => {
    expect(canTransitionStaffingRequest('SUBMITTED', 'APPROVED_FOR_VACANCY')).toBe(false)
    expect(canTransitionStaffingRequest('SUBMITTED', 'AWAITING_HR_REVIEW')).toBe(false)
    expect(canTransitionStaffingRequest('DRAFT', 'FUNDING_CONFIRMED')).toBe(false)
  })

  it('lets a rejected funding decision be corrected and resubmitted', () => {
    expect(canTransitionStaffingRequest('FUNDING_REJECTED', 'RETURNED_FOR_CORRECTION')).toBe(true)
    expect(canTransitionStaffingRequest('RETURNED_FOR_CORRECTION', 'SUBMITTED')).toBe(true)
  })

  it('treats rejection and cancellation as final', () => {
    expect(allowedStaffingRequestTransitions('REJECTED')).toEqual([])
    expect(allowedStaffingRequestTransitions('CANCELLED')).toEqual([])
  })

  it('fails closed on an unrecognised status', () => {
    expect(canTransitionStaffingRequest('NONSENSE', 'SUBMITTED')).toBe(false)
    expect(canTransitionStaffingRequest('NONSENSE', 'NONSENSE')).toBe(false)
  })

  it('accepts an idempotent same-status write for every known status', () => {
    for (const status of STAFFING_REQUEST_STATUSES)
      expect(canTransitionStaffingRequest(status, status)).toBe(true)
  })
})

describe('vacancy creation gate — §6', () => {
  it('only allows a vacancy from an approved request', () => {
    expect(canCreateVacancyFrom('APPROVED_FOR_VACANCY')).toBe(true)
    expect(canCreateVacancyFrom('HR_APPROVED')).toBe(false)
    expect(canCreateVacancyFrom('FUNDING_CONFIRMED')).toBe(false)
    expect(canCreateVacancyFrom('DRAFT')).toBe(false)
  })
})

describe('open-request tracking — §22', () => {
  it('counts anything still needing action as open', () => {
    expect(isOpenStaffingRequest('AWAITING_FUNDING_CONFIRMATION')).toBe(true)
    expect(isOpenStaffingRequest('AWAITING_HR_REVIEW')).toBe(true)
  })

  it('excludes settled requests', () => {
    expect(isOpenStaffingRequest('APPROVED_FOR_VACANCY')).toBe(false)
    expect(isOpenStaffingRequest('REJECTED')).toBe(false)
    expect(isOpenStaffingRequest('CANCELLED')).toBe(false)
  })
})

describe('executive escalation — §3.9', () => {
  it('escalates senior grades', () => {
    expect(requiresExecutiveApproval({ ...base, jobGrade: 'D1' })).toBe(true)
    expect(executiveApprovalReason({ ...base, jobGrade: 'D1' })).toBe('Senior management grade')
  })

  it('escalates emergency recruitment', () => {
    expect(requiresExecutiveApproval({ ...base, urgency: 'EMERGENCY' })).toBe(true)
    expect(executiveApprovalReason({ ...base, urgency: 'EMERGENCY' })).toBe('Emergency recruitment')
  })

  it('escalates a new establishment of three or more posts', () => {
    expect(requiresExecutiveApproval({ ...base, isReplacement: false, numberOfPositions: 3 })).toBe(true)
  })

  it('does not escalate a routine single replacement', () => {
    expect(requiresExecutiveApproval(base)).toBe(false)
    expect(executiveApprovalReason(base)).toBeNull()
  })

  it('does not escalate a two-post new establishment at a junior grade', () => {
    expect(requiresExecutiveApproval({ ...base, isReplacement: false, numberOfPositions: 2 })).toBe(false)
  })
})
