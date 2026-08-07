import { allowedApplicationTransitions } from './state-machine'

/**
 * Every internal application stage, in pipeline order.
 *
 * Filter dropdowns used to be built from whatever stages happened to appear in
 * the rows already loaded, which meant a stage with no current applications
 * could not be filtered for at all — and once lists became paginated, the list
 * would have changed from page to page.
 */
export const APPLICATION_STAGES = [
  'DRAFT',
  'INCOMPLETE',
  'SUBMITTED',
  'UNDER_REVIEW',
  'EXCEPTION_REVIEW',
  'LONGLISTED',
  'NOT_LONGLISTED',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'ASSESSMENT_INVITED',
  'ASSESSMENT_COMPLETED',
  'ASSESSMENT_PASSED',
  'ASSESSMENT_FAILED',
  'INTERVIEW_INVITED',
  'INTERVIEW_COMPLETED',
  'REFERENCE_CHECK',
  'BACKGROUND_CHECK',
  'RECOMMENDED',
  'RESERVE',
  'CONDITIONAL_OFFER',
  'OFFER_DRAFT',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
  'PREBOARDING',
  'PRE_EMPLOYMENT_CLEARANCE',
  'READY_TO_RESUME',
  'RESUMED',
  'READY_FOR_ERP_TRANSFER',
  'TRANSFERRED_TO_ERP',
  'NOT_SELECTED',
  'INELIGIBLE',
  'WITHDRAWN',
  'CANCELLED',
  'ARCHIVED',
] as const

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

/**
 * Stages that legitimately have no onward transition. Everything else with an
 * empty transition list is a drift bug between this list and the state machine.
 */
const TERMINAL_STAGES = ['ARCHIVED', 'NOT_LONGLISTED', 'NOT_SHORTLISTED'] as const

/** Guard against this list drifting away from the state machine. */
export function unknownStages(): string[] {
  return APPLICATION_STAGES.filter(
    (stage) =>
      allowedApplicationTransitions(stage).length === 0 &&
      !(TERMINAL_STAGES as readonly string[]).includes(stage)
  )
}
