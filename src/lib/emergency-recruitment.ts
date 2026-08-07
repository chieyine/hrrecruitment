/**
 * Emergency recruitment (End_to_End.md §28.7).
 *
 * The section's closing line is the whole design constraint: "Emergency
 * recruitment should be faster, but essential controls should not be removed."
 *
 * So this module shortens *timelines* and reuses *pre-approved material*. It
 * never removes an approval, a check, or an audit record. What it does remove is
 * waiting: shorter service targets, pre-approved job descriptions and assessment
 * templates, roster candidates who were already assessed, and same-day
 * scheduling. Everything skipped for speed is written down and reviewed
 * afterwards.
 */

/** §28.7 Controls that are never waived, whatever the urgency. */
export const NON_WAIVABLE_CONTROLS = [
  'IDENTITY',
  'SAFEGUARDING',
  'REFERENCES',
  'FUNDING_CONFIRMATION',
  'OFFER_APPROVAL',
] as const

export type NonWaivableControl = (typeof NON_WAIVABLE_CONTROLS)[number]

export const NON_WAIVABLE_CONTROL_LABELS: Record<NonWaivableControl, string> = {
  IDENTITY: 'Identity verification',
  SAFEGUARDING: 'Safeguarding check',
  REFERENCES: 'At least one satisfactory reference',
  FUNDING_CONFIRMATION: 'Budget Holder funding confirmation',
  OFFER_APPROVAL: 'HR Manager offer approval',
}

/**
 * §28.7 Shortened service standards, in hours rather than days.
 *
 * These are targets that drive due dates and escalation — they do not permit a
 * stage to be skipped, only to be chased sooner.
 */
export const EMERGENCY_SERVICE_HOURS: Record<string, number> = {
  STAFFING_REQUEST_REVIEW: 4,
  BUDGET_CONFIRMATION: 4,
  VACANCY_APPROVAL: 4,
  ADVERTISING_PERIOD: 48,
  LONGLISTING: 4,
  SHORTLISTING: 8,
  ASSESSMENT: 24,
  INTERVIEW: 24,
  REFERENCE_CHECKING: 24,
  OFFER_APPROVAL: 4,
  PRE_EMPLOYMENT_CLEARANCE: 48,
}

/** Standard-route equivalents, for showing what the acceleration actually buys. */
export const STANDARD_SERVICE_HOURS: Record<string, number> = {
  STAFFING_REQUEST_REVIEW: 72,
  BUDGET_CONFIRMATION: 72,
  VACANCY_APPROVAL: 72,
  ADVERTISING_PERIOD: 336,
  LONGLISTING: 72,
  SHORTLISTING: 120,
  ASSESSMENT: 168,
  INTERVIEW: 168,
  REFERENCE_CHECKING: 120,
  OFFER_APPROVAL: 72,
  PRE_EMPLOYMENT_CLEARANCE: 240,
}

export function serviceHoursFor(stage: string, emergency: boolean): number | null {
  const table = emergency ? EMERGENCY_SERVICE_HOURS : STANDARD_SERVICE_HOURS
  return table[stage] ?? null
}

/** Due date for a stage under the applicable route. */
export function stageDueAt(stage: string, emergency: boolean, from = new Date()): Date | null {
  const hours = serviceHoursFor(stage, emergency)
  if (hours === null) return null
  return new Date(from.getTime() + hours * 3_600_000)
}

/**
 * §28.7 The minimum advertising period. Emergency recruitment may shorten it,
 * but not to nothing — a vacancy nobody could see was never really advertised.
 */
export const MINIMUM_EMERGENCY_ADVERT_HOURS = 24

export function validateEmergencyAdvertPeriod(openingAt: Date, closingAt: Date): string | null {
  const hours = (closingAt.getTime() - openingAt.getTime()) / 3_600_000
  if (hours < MINIMUM_EMERGENCY_ADVERT_HOURS)
    return `An emergency vacancy must still be open for at least ${MINIMUM_EMERGENCY_ADVERT_HOURS} hours`
  return null
}

export interface EmergencyReadiness {
  /** Controls confirmed complete. */
  satisfied: NonWaivableControl[]
  /** Controls still outstanding — these block the offer, emergency or not. */
  outstanding: NonWaivableControl[]
  clear: boolean
}

/**
 * §28.7 "Mandatory identity, reference, and safeguarding controls".
 *
 * Evaluated from evidence already in the record, so an emergency hire cannot
 * reach offer approval by simply moving faster than the checks.
 */
export function assessEmergencyControls(input: {
  backgroundChecks: Array<{ checkType: string; status: string }>
  referenceOutcomes: string[]
  fundingConfirmed: boolean
  offerApproved: boolean
}): EmergencyReadiness {
  const satisfied: NonWaivableControl[] = []
  const outstanding: NonWaivableControl[] = []

  const checkSettled = (type: string) =>
    input.backgroundChecks.some(
      (check) => check.checkType === type && ['CLEARED', 'WAIVED', 'NOT_APPLICABLE'].includes(check.status)
    )

  ;(checkSettled('IDENTITY') ? satisfied : outstanding).push('IDENTITY')
  ;(checkSettled('SAFEGUARDING') ? satisfied : outstanding).push('SAFEGUARDING')
  ;(input.referenceOutcomes.some((outcome) => outcome === 'SATISFACTORY') ? satisfied : outstanding).push(
    'REFERENCES'
  )
  ;(input.fundingConfirmed ? satisfied : outstanding).push('FUNDING_CONFIRMATION')
  ;(input.offerApproved ? satisfied : outstanding).push('OFFER_APPROVAL')

  return { satisfied, outstanding, clear: outstanding.length === 0 }
}

/**
 * §28.7 Post-recruitment compliance review.
 *
 * Every acceleration is listed so the review has something concrete to examine.
 * An emergency exercise that used no accelerations at all is worth knowing about
 * too — it suggests the classification was unnecessary.
 */
export interface ComplianceReviewInput {
  vacancyReference: string
  emergencyJustification: string | null
  approvedBy: string | null
  approvedAt: Date | null
  advertHours: number
  usedRoster: boolean
  usedPreApprovedJobDescription: boolean
  usedPreApprovedAssessment: boolean
  controls: EmergencyReadiness
  timeToOfferHours: number | null
}

export function buildComplianceReview(input: ComplianceReviewInput) {
  const accelerations: string[] = []
  if (input.advertHours < STANDARD_SERVICE_HOURS.ADVERTISING_PERIOD)
    accelerations.push(
      `Advertising period shortened to ${Math.round(input.advertHours)} hours from a standard ${STANDARD_SERVICE_HOURS.ADVERTISING_PERIOD}`
    )
  if (input.usedRoster) accelerations.push('Candidates drawn from an existing roster')
  if (input.usedPreApprovedJobDescription) accelerations.push('Pre-approved job description used')
  if (input.usedPreApprovedAssessment) accelerations.push('Pre-approved assessment template used')

  const findings: string[] = []
  if (!input.emergencyJustification?.trim())
    findings.push('No written justification was recorded for the emergency classification')
  if (!input.approvedBy) findings.push('The emergency classification was not approved by an authorised officer')
  if (input.advertHours < MINIMUM_EMERGENCY_ADVERT_HOURS)
    findings.push(`Advertising period was below the ${MINIMUM_EMERGENCY_ADVERT_HOURS}-hour minimum`)
  for (const control of input.controls.outstanding)
    findings.push(`${NON_WAIVABLE_CONTROL_LABELS[control]} was not completed`)
  if (!accelerations.length)
    findings.push('The exercise was classified as an emergency but used no accelerated provisions')

  return {
    vacancyReference: input.vacancyReference,
    justification: input.emergencyJustification,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    timeToOfferHours: input.timeToOfferHours,
    accelerations,
    controlsSatisfied: input.controls.satisfied.map((control) => NON_WAIVABLE_CONTROL_LABELS[control]),
    findings,
    outcome: findings.length ? ('FINDINGS_RAISED' as const) : ('COMPLIANT' as const),
  }
}
