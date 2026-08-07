/**
 * Background and due-diligence checks (End_to_End.md §16, §28.11).
 *
 * Two rules shape this module:
 *   - findings are restricted, and an ordinary panel member must never reach
 *     them (§16, §3.8);
 *   - only necessary information is transmitted to a provider (§28.11).
 */

export const CHECK_TYPES = [
  'IDENTITY',
  'QUALIFICATION',
  'EMPLOYMENT',
  'PROFESSIONAL_LICENCE',
  'CRIMINAL_RECORD',
  'SANCTIONS_SCREENING',
  'SAFEGUARDING',
  'WORK_AUTHORISATION',
  'DRIVING_LICENCE',
] as const

export type CheckType = (typeof CHECK_TYPES)[number]

export const CHECK_STATUSES = [
  'NOT_REQUESTED',
  'REQUESTED',
  'IN_PROGRESS',
  'RECEIVED',
  'CLEARED',
  'CONCERNS_RAISED',
  'FAILED',
  'WAIVED',
  'NOT_APPLICABLE',
] as const

export type CheckStatus = (typeof CHECK_STATUSES)[number]

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  IDENTITY: 'Identity verification',
  QUALIFICATION: 'Qualification verification',
  EMPLOYMENT: 'Employment verification',
  PROFESSIONAL_LICENCE: 'Professional licence verification',
  CRIMINAL_RECORD: 'Criminal-record check',
  SANCTIONS_SCREENING: 'Sanctions screening',
  SAFEGUARDING: 'Safeguarding check',
  WORK_AUTHORISATION: 'Work-authorisation check',
  DRIVING_LICENCE: 'Driving-licence verification',
}

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  NOT_REQUESTED: 'Not requested',
  REQUESTED: 'Requested',
  IN_PROGRESS: 'In progress',
  RECEIVED: 'Response received',
  CLEARED: 'Cleared',
  CONCERNS_RAISED: 'Concerns raised',
  FAILED: 'Failed',
  WAIVED: 'Waived with approval',
  NOT_APPLICABLE: 'Not applicable',
}

/**
 * §16 Some checks are only lawful in particular circumstances. Rather than
 * silently omitting them, the platform requires an explicit lawful basis to be
 * recorded before a sensitive check may be requested.
 */
export const REQUIRES_LAWFUL_BASIS: readonly CheckType[] = [
  'CRIMINAL_RECORD',
  'SAFEGUARDING',
  'SANCTIONS_SCREENING',
]

export function requiresLawfulBasis(checkType: string): boolean {
  return (REQUIRES_LAWFUL_BASIS as readonly string[]).includes(checkType)
}

/**
 * Findings on these check types are the most sensitive and are visible only to
 * users holding `backgroundcheck.read.restricted` (§16, §25).
 */
export const RESTRICTED_CHECK_TYPES: readonly CheckType[] = [
  'CRIMINAL_RECORD',
  'SAFEGUARDING',
  'SANCTIONS_SCREENING',
]

export function isRestrictedCheck(checkType: string): boolean {
  return (RESTRICTED_CHECK_TYPES as readonly string[]).includes(checkType)
}

/** A check is settled once it can no longer block progression. */
export function isSettled(status: string): boolean {
  return ['CLEARED', 'FAILED', 'WAIVED', 'NOT_APPLICABLE'].includes(status)
}

/** A check that stops an offer being approved (§17, §18). */
export function isBlocking(status: string): boolean {
  return ['NOT_REQUESTED', 'REQUESTED', 'IN_PROGRESS', 'RECEIVED', 'CONCERNS_RAISED'].includes(status)
}

/**
 * §18 Which checks a given vacancy must complete. Safeguarding classification
 * and the role itself decide the set: a driver needs a licence check, a role
 * working with children needs safeguarding clearance.
 */
export function requiredChecksFor(input: {
  safeguardingClassification: string
  contractType: string
  title: string
}): CheckType[] {
  const required = new Set<CheckType>(['IDENTITY', 'QUALIFICATION', 'EMPLOYMENT', 'WORK_AUTHORISATION'])

  if (input.safeguardingClassification === 'ELEVATED' || input.safeguardingClassification === 'HIGH') {
    required.add('SAFEGUARDING')
    required.add('CRIMINAL_RECORD')
  }
  // §28.11 sanctions screening is standard for internationally funded roles and
  // mandatory wherever safeguarding sensitivity is high.
  if (input.safeguardingClassification === 'HIGH') required.add('SANCTIONS_SCREENING')

  if (/\bdriver\b/i.test(input.title)) required.add('DRIVING_LICENCE')
  if (/\b(nurse|doctor|midwife|pharmacist|clinical|medical officer)\b/i.test(input.title))
    required.add('PROFESSIONAL_LICENCE')

  return [...required]
}

/**
 * §28.11 "transmit only necessary information". Each check type declares the
 * minimum field set it needs; nothing else is ever sent to a provider.
 */
const PROVIDER_FIELDS: Record<CheckType, string[]> = {
  IDENTITY: ['fullName', 'dateOfBirth', 'identityDocumentNumber'],
  QUALIFICATION: ['fullName', 'institution', 'qualification', 'completionYear'],
  EMPLOYMENT: ['fullName', 'employer', 'jobTitle', 'startDate', 'endDate'],
  PROFESSIONAL_LICENCE: ['fullName', 'professionalBody', 'licenceNumber'],
  CRIMINAL_RECORD: ['fullName', 'dateOfBirth', 'identityDocumentNumber'],
  SANCTIONS_SCREENING: ['fullName', 'dateOfBirth', 'nationality'],
  SAFEGUARDING: ['fullName', 'dateOfBirth'],
  WORK_AUTHORISATION: ['fullName', 'nationality', 'permitNumber'],
  DRIVING_LICENCE: ['fullName', 'licenceNumber', 'licenceClass'],
}

export function minimalProviderPayload(checkType: string, source: Record<string, unknown>) {
  const allowed = PROVIDER_FIELDS[checkType as CheckType] ?? ['fullName']
  const payload: Record<string, unknown> = {}
  for (const field of allowed) if (source[field] !== undefined && source[field] !== null) payload[field] = source[field]
  return payload
}
