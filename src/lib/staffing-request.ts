/**
 * Staffing request lifecycle (End_to_End.md §5).
 *
 * A staffing request is the origin of every vacancy. It carries the hiring
 * department's justification (§3.6), passes through the Budget Holder for the
 * money (§3.7), and only then reaches HR for vacancy preparation (§6).
 *
 * The transition table below is the single authority on what may follow what.
 * Routes must never set a status directly.
 */

export const STAFFING_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'RETURNED_FOR_CORRECTION',
  'AWAITING_FUNDING_CONFIRMATION',
  'FUNDING_CONFIRMED',
  'FUNDING_REJECTED',
  'AWAITING_HR_REVIEW',
  'HR_APPROVED',
  'AWAITING_EXECUTIVE_APPROVAL',
  'APPROVED_FOR_VACANCY',
  'REJECTED',
  'CANCELLED',
] as const

export type StaffingRequestStatus = (typeof STAFFING_REQUEST_STATUSES)[number]

/**
 * §5.2 order of operations: the department submits, the Budget Holder confirms
 * the money, HR reviews the substance, and the executive is only involved where
 * policy demands it.
 */
const TRANSITIONS: Record<StaffingRequestStatus, StaffingRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['AWAITING_FUNDING_CONFIRMATION', 'RETURNED_FOR_CORRECTION', 'REJECTED', 'CANCELLED'],
  RETURNED_FOR_CORRECTION: ['SUBMITTED', 'CANCELLED'],
  AWAITING_FUNDING_CONFIRMATION: ['FUNDING_CONFIRMED', 'FUNDING_REJECTED', 'RETURNED_FOR_CORRECTION', 'CANCELLED'],
  FUNDING_CONFIRMED: ['AWAITING_HR_REVIEW', 'CANCELLED'],
  // A funding rejection is recoverable: the department may revise the budget
  // line or ceiling and resubmit rather than starting again.
  FUNDING_REJECTED: ['RETURNED_FOR_CORRECTION', 'CANCELLED'],
  AWAITING_HR_REVIEW: ['HR_APPROVED', 'RETURNED_FOR_CORRECTION', 'REJECTED', 'CANCELLED'],
  HR_APPROVED: ['AWAITING_EXECUTIVE_APPROVAL', 'APPROVED_FOR_VACANCY', 'CANCELLED'],
  AWAITING_EXECUTIVE_APPROVAL: ['APPROVED_FOR_VACANCY', 'REJECTED', 'RETURNED_FOR_CORRECTION', 'CANCELLED'],
  APPROVED_FOR_VACANCY: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
}

export function isKnownStaffingRequestStatus(status: string): status is StaffingRequestStatus {
  return status in TRANSITIONS
}

export function canTransitionStaffingRequest(from: string, to: string): boolean {
  if (!isKnownStaffingRequestStatus(from)) return false
  if (from === to) return true
  return TRANSITIONS[from].includes(to as StaffingRequestStatus)
}

export function allowedStaffingRequestTransitions(from: string): StaffingRequestStatus[] {
  return isKnownStaffingRequestStatus(from) ? TRANSITIONS[from] : []
}

/** Statuses that still need someone to act. Drives the §22 dashboard tiles. */
export function isOpenStaffingRequest(status: string): boolean {
  return !['APPROVED_FOR_VACANCY', 'REJECTED', 'CANCELLED'].includes(status)
}

/** Only an approved request may become a vacancy (§6). */
export function canCreateVacancyFrom(status: string): boolean {
  return status === 'APPROVED_FOR_VACANCY'
}

export const STAFFING_REQUEST_STATUS_LABELS: Record<StaffingRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  RETURNED_FOR_CORRECTION: 'Returned for correction',
  AWAITING_FUNDING_CONFIRMATION: 'Awaiting Budget Holder confirmation',
  FUNDING_CONFIRMED: 'Funding confirmed',
  FUNDING_REJECTED: 'Funding rejected',
  AWAITING_HR_REVIEW: 'Awaiting HR review',
  HR_APPROVED: 'HR approved',
  AWAITING_EXECUTIVE_APPROVAL: 'Awaiting executive approval',
  APPROVED_FOR_VACANCY: 'Approved for vacancy preparation',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export function staffingRequestStatusLabel(status: string): string {
  return (
    STAFFING_REQUEST_STATUS_LABELS[status as StaffingRequestStatus] ||
    status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  )
}

/**
 * §3.9 Executive approval is not required for every request. It is reserved for
 * senior roles, recruitment outside the approved structure, exceptional salary
 * proposals, and emergency hiring.
 */
export function requiresExecutiveApproval(request: {
  jobGrade: string
  urgency: string
  isReplacement: boolean
  numberOfPositions: number
}): boolean {
  const seniorGrade = /^(D|E|SM|EX)/i.test(request.jobGrade.trim())
  if (seniorGrade) return true
  if (request.urgency === 'EMERGENCY') return true
  // A brand-new establishment of several posts is a structural change, not a
  // like-for-like replacement.
  if (!request.isReplacement && request.numberOfPositions >= 3) return true
  return false
}

/** Human-readable explanation shown next to the escalation, so it is never opaque. */
export function executiveApprovalReason(request: {
  jobGrade: string
  urgency: string
  isReplacement: boolean
  numberOfPositions: number
}): string | null {
  if (/^(D|E|SM|EX)/i.test(request.jobGrade.trim())) return 'Senior management grade'
  if (request.urgency === 'EMERGENCY') return 'Emergency recruitment'
  if (!request.isReplacement && request.numberOfPositions >= 3)
    return 'New establishment of three or more positions'
  return null
}
