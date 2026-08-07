/**
 * Application & vacancy state transition rules (README §42).
 * The backend must reject arbitrary status changes.
 */

const APPLICATION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'INCOMPLETE', 'WITHDRAWN', 'CANCELLED'],
  // §21.2 an incomplete application can still be completed before the deadline.
  INCOMPLETE: ['SUBMITTED', 'WITHDRAWN', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'EXCEPTION_REVIEW', 'LONGLISTED', 'NOT_LONGLISTED', 'INELIGIBLE', 'WITHDRAWN', 'CANCELLED'],
  UNDER_REVIEW: ['EXCEPTION_REVIEW', 'LONGLISTED', 'NOT_LONGLISTED', 'INELIGIBLE', 'WITHDRAWN', 'CANCELLED'],
  // §11.4 the exception queue resolves in exactly one of three directions.
  EXCEPTION_REVIEW: ['LONGLISTED', 'NOT_LONGLISTED', 'INELIGIBLE', 'WITHDRAWN', 'CANCELLED'],
  LONGLISTED: ['SHORTLISTED', 'NOT_SHORTLISTED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  NOT_LONGLISTED: [],
  SHORTLISTED: ['ASSESSMENT_INVITED', 'INTERVIEW_INVITED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  NOT_SHORTLISTED: [],
  ASSESSMENT_INVITED: ['ASSESSMENT_COMPLETED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  ASSESSMENT_COMPLETED: ['ASSESSMENT_PASSED', 'ASSESSMENT_FAILED', 'INTERVIEW_INVITED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  ASSESSMENT_PASSED: ['INTERVIEW_INVITED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  ASSESSMENT_FAILED: ['NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  INTERVIEW_INVITED: ['INTERVIEW_COMPLETED', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  INTERVIEW_COMPLETED: ['REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  REFERENCE_CHECK: ['BACKGROUND_CHECK', 'RECOMMENDED', 'NOT_SELECTED', 'RESERVE', 'WITHDRAWN', 'CANCELLED'],
  // §16 due diligence sits between references and the offer.
  BACKGROUND_CHECK: ['RECOMMENDED', 'NOT_SELECTED', 'RESERVE', 'WITHDRAWN', 'CANCELLED'],
  RECOMMENDED: ['CONDITIONAL_OFFER', 'OFFER_DRAFT', 'NOT_SELECTED', 'RESERVE', 'WITHDRAWN', 'CANCELLED'],
  RESERVE: ['RECOMMENDED', 'NOT_SELECTED', 'CANCELLED'],
  // §21.2 a conditional offer precedes the formal offer document.
  CONDITIONAL_OFFER: ['OFFER_DRAFT', 'NOT_SELECTED', 'WITHDRAWN', 'CANCELLED'],
  OFFER_DRAFT: ['OFFER_SENT', 'CANCELLED'],
  OFFER_SENT: ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'OFFER_EXPIRED', 'CANCELLED'],
  OFFER_ACCEPTED: ['PREBOARDING', 'CANCELLED'],
  PREBOARDING: ['PRE_EMPLOYMENT_CLEARANCE', 'READY_TO_RESUME', 'CANCELLED'],
  // §18 clearance is the gate that precedes readiness to start.
  PRE_EMPLOYMENT_CLEARANCE: ['READY_TO_RESUME', 'CANCELLED'],
  READY_TO_RESUME: ['RESUMED', 'CANCELLED'],
  RESUMED: ['READY_FOR_ERP_TRANSFER', 'TRANSFERRED_TO_ERP'],
  // §19.1 approval to transfer is its own state so the queue is visible.
  READY_FOR_ERP_TRANSFER: ['TRANSFERRED_TO_ERP', 'CANCELLED'],
  TRANSFERRED_TO_ERP: ['ARCHIVED'],
  // OFFER_SENT can move into these, so they must exist as keys. Without an
  // entry `allowedApplicationTransitions` silently returned [] for an unknown
  // status, making a genuine terminal state indistinguishable from a typo.
  OFFER_DECLINED: ['ARCHIVED'],
  OFFER_EXPIRED: ['ARCHIVED'],
  NOT_SELECTED: ['ARCHIVED'],
  INELIGIBLE: ['ARCHIVED'],
  WITHDRAWN: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
}

const VACANCY_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['DRAFT', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'SCHEDULED', 'OPEN', 'CANCELLED'],
  // §21.1 a returned vacancy goes back to the author rather than dying.
  RETURNED_FOR_CORRECTION: ['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'OPEN', 'CANCELLED'],
  SCHEDULED: ['OPEN', 'CANCELLED'],
  OPEN: ['PAUSED', 'CLOSED', 'CANCELLED'],
  PAUSED: ['OPEN', 'CLOSED', 'CANCELLED'],
  // §21.1 the vacancy tracks which recruitment stage it has reached.
  CLOSED: ['LONGLISTING', 'COMPLETED', 'CANCELLED'],
  LONGLISTING: ['SHORTLISTING', 'CLOSED', 'CANCELLED'],
  SHORTLISTING: ['ASSESSMENT', 'INTERVIEW', 'LONGLISTING', 'CANCELLED'],
  ASSESSMENT: ['INTERVIEW', 'SHORTLISTING', 'CANCELLED'],
  INTERVIEW: ['DUE_DILIGENCE', 'OFFER', 'ASSESSMENT', 'CANCELLED'],
  DUE_DILIGENCE: ['OFFER', 'INTERVIEW', 'CANCELLED'],
  OFFER: ['FILLED', 'DUE_DILIGENCE', 'CANCELLED'],
  FILLED: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
}

/** True when `status` is a status this state machine actually knows about. */
export function isKnownApplicationStatus(status: string): boolean {
  return status in APPLICATION_TRANSITIONS
}

export function canTransitionApplication(from: string, to: string): boolean {
  // An unrecognised source status must never be treated as a valid no-op.
  if (!isKnownApplicationStatus(from)) return false
  if (from === to) return true
  return APPLICATION_TRANSITIONS[from].includes(to)
}

export function canTransitionVacancy(from: string, to: string): boolean {
  if (!(from in VACANCY_TRANSITIONS)) return false
  if (from === to) return true
  return VACANCY_TRANSITIONS[from].includes(to)
}

/** Statuses the generic recruitment stage command may set. Later workflow
 * outcomes are owned by assessment/interview/reference/selection/offer/
 * preboarding/resumption endpoints that enforce their evidence gates. */
export function isGenericApplicationStage(to: string): boolean {
  return [
    'UNDER_REVIEW',
    'EXCEPTION_REVIEW',
    'LONGLISTED',
    'NOT_LONGLISTED',
    'SHORTLISTED',
    'NOT_SHORTLISTED',
    'INELIGIBLE',
    'CANCELLED',
  ].includes(to)
}

export function allowedApplicationTransitions(from: string): string[] {
  return APPLICATION_TRANSITIONS[from] ?? []
}

export function allowedVacancyTransitions(from: string): string[] {
  return VACANCY_TRANSITIONS[from] ?? []
}

/**
 * §3.1 Applicants must not see internal deliberation. Several distinct internal
 * stages therefore collapse to the same candidate-facing status: an applicant
 * being reviewed as an exception sees "under review", not that their file was
 * flagged as unclear.
 */
const CANDIDATE_VISIBLE_STATUS: Record<string, string> = {
  DRAFT: 'APPLICATION_DRAFT',
  INCOMPLETE: 'INCOMPLETE',
  SUBMITTED: 'APPLICATION_RECEIVED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  EXCEPTION_REVIEW: 'UNDER_REVIEW',
  LONGLISTED: 'UNDER_REVIEW',
  NOT_LONGLISTED: 'UNSUCCESSFUL',
  SHORTLISTED: 'SHORTLISTED',
  NOT_SHORTLISTED: 'UNSUCCESSFUL',
  ASSESSMENT_INVITED: 'ASSESSMENT_STAGE',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_STAGE',
  ASSESSMENT_PASSED: 'ASSESSMENT_STAGE',
  ASSESSMENT_FAILED: 'UNSUCCESSFUL',
  INTERVIEW_INVITED: 'INTERVIEW_STAGE',
  INTERVIEW_COMPLETED: 'INTERVIEW_STAGE',
  REFERENCE_CHECK: 'UNDER_REVIEW',
  BACKGROUND_CHECK: 'UNDER_REVIEW',
  RECOMMENDED: 'UNDER_REVIEW',
  RESERVE: 'UNDER_REVIEW',
  CONDITIONAL_OFFER: 'CONDITIONAL_OFFER',
  OFFER_DRAFT: 'UNDER_REVIEW',
  OFFER_SENT: 'OFFER_SENT',
  OFFER_ACCEPTED: 'PREBOARDING_IN_PROGRESS',
  PREBOARDING: 'PREBOARDING_IN_PROGRESS',
  PRE_EMPLOYMENT_CLEARANCE: 'PREBOARDING_IN_PROGRESS',
  READY_TO_RESUME: 'READY_TO_RESUME',
  RESUMED: 'RECRUITMENT_COMPLETED',
  READY_FOR_ERP_TRANSFER: 'RECRUITMENT_COMPLETED',
  TRANSFERRED_TO_ERP: 'RECRUITMENT_COMPLETED',
  INELIGIBLE: 'UNSUCCESSFUL',
  NOT_SELECTED: 'UNSUCCESSFUL',
  OFFER_DECLINED: 'RECRUITMENT_COMPLETED',
  OFFER_EXPIRED: 'RECRUITMENT_COMPLETED',
  WITHDRAWN: 'RECRUITMENT_COMPLETED',
  CANCELLED: 'RECRUITMENT_COMPLETED',
  ARCHIVED: 'RECRUITMENT_COMPLETED',
}

export function candidateVisibleStatusForInternal(status: string): string {
  return CANDIDATE_VISIBLE_STATUS[status] || 'UNDER_REVIEW'
}
