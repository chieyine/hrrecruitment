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
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
  'PREBOARDING',
  'READY_TO_RESUME',
  'RESUMED',
  'TRANSFERRED_TO_ERP',
  'NOT_SELECTED',
  'INELIGIBLE',
  'WITHDRAWN',
  'CANCELLED',
] as const

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

/** Guard against this list drifting away from the state machine. */
export function unknownStages(): string[] {
  return APPLICATION_STAGES.filter((stage) => allowedApplicationTransitions(stage).length === 0 && ![
    'TRANSFERRED_TO_ERP', 'NOT_SELECTED', 'INELIGIBLE', 'WITHDRAWN', 'CANCELLED', 'OFFER_DECLINED', 'OFFER_EXPIRED',
  ].includes(stage))
}
