/**
 * Anonymised longlisting and shortlisting (End_to_End.md §28.3).
 *
 * HR decides, per vacancy, which personal fields reviewers may see during early
 * review. The redaction happens on the server before the data is serialised —
 * a field the browser never receives cannot be revealed by inspecting the page.
 */

/** §28.3 The fields that may be hidden. */
export const ANONYMISABLE_FIELDS = [
  'NAME',
  'PHOTOGRAPH',
  'GENDER',
  'AGE',
  'ADDRESS',
  'NATIONALITY',
  'RELIGION',
  'MARITAL_STATUS',
  'CONTACT_DETAILS',
  'INSTITUTION_NAMES',
] as const

export type AnonymisableField = (typeof ANONYMISABLE_FIELDS)[number]

export const ANONYMISABLE_FIELD_LABELS: Record<AnonymisableField, string> = {
  NAME: 'Name',
  PHOTOGRAPH: 'Photograph',
  GENDER: 'Gender',
  AGE: 'Age and date of birth',
  ADDRESS: 'Address',
  NATIONALITY: 'Nationality',
  RELIGION: 'Religion',
  MARITAL_STATUS: 'Marital status',
  CONTACT_DETAILS: 'Email and phone number',
  INSTITUTION_NAMES: 'School and university names',
}

/** A sensible default set for a vacancy that switches anonymised review on. */
export const DEFAULT_ANONYMISED_FIELDS: AnonymisableField[] = [
  'NAME',
  'PHOTOGRAPH',
  'GENDER',
  'AGE',
  'ADDRESS',
  'NATIONALITY',
  'RELIGION',
  'MARITAL_STATUS',
  'CONTACT_DETAILS',
]

export interface AnonymisationPolicy {
  enabled: boolean
  hidden: Set<string>
}

export function parseAnonymisationPolicy(vacancy: {
  anonymisedReview: boolean
  anonymisedFieldsJson: string
}): AnonymisationPolicy {
  if (!vacancy.anonymisedReview) return { enabled: false, hidden: new Set() }
  let fields: string[] = []
  try {
    const parsed = JSON.parse(vacancy.anonymisedFieldsJson || '[]')
    fields = Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    fields = []
  }
  // An enabled policy with an unreadable field list must fail closed: hide the
  // defaults rather than silently reveal everything.
  return { enabled: true, hidden: new Set(fields.length ? fields : DEFAULT_ANONYMISED_FIELDS) }
}

/**
 * A stable pseudonym so reviewers can discuss "Candidate A7C3" without ever
 * seeing a name. Derived from the application reference, so it is consistent
 * across screens and across a reviewer's session.
 */
export function candidateAlias(applicationId: string, applicationReference?: string | null): string {
  const source = applicationReference || applicationId
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }
  return `Candidate ${hash.toString(36).toUpperCase().padStart(4, '0').slice(-4)}`
}

export interface AnonymisableCandidate {
  id: string
  legalFirstName: string
  middleName?: string | null
  lastName: string
  preferredName?: string | null
  nationality?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  lga?: string | null
  countryOfResidence?: string | null
  primaryPhone?: string | null
  alternatePhone?: string | null
  user?: { email: string } | null
}

/**
 * Apply the policy to one candidate record. Returns a shape with the same keys
 * so callers do not have to branch, with hidden values replaced by null and an
 * `alias` supplied whenever the name is hidden.
 */
export function applyAnonymisation<T extends AnonymisableCandidate>(
  candidate: T,
  policy: AnonymisationPolicy,
  context: { applicationId: string; applicationReference?: string | null }
) {
  if (!policy.enabled) {
    return {
      ...candidate,
      alias: null as string | null,
      anonymised: false,
      hiddenFields: [] as string[],
    }
  }

  const hide = (field: AnonymisableField) => policy.hidden.has(field)
  const nameHidden = hide('NAME')

  return {
    ...candidate,
    legalFirstName: nameHidden ? '' : candidate.legalFirstName,
    middleName: nameHidden ? null : (candidate.middleName ?? null),
    lastName: nameHidden ? '' : candidate.lastName,
    preferredName: nameHidden ? null : (candidate.preferredName ?? null),
    nationality: hide('NATIONALITY') ? null : (candidate.nationality ?? null),
    address: hide('ADDRESS') ? null : (candidate.address ?? null),
    city: hide('ADDRESS') ? null : (candidate.city ?? null),
    state: hide('ADDRESS') ? null : (candidate.state ?? null),
    lga: hide('ADDRESS') ? null : (candidate.lga ?? null),
    countryOfResidence: hide('ADDRESS') ? null : (candidate.countryOfResidence ?? null),
    primaryPhone: hide('CONTACT_DETAILS') ? null : (candidate.primaryPhone ?? null),
    alternatePhone: hide('CONTACT_DETAILS') ? null : (candidate.alternatePhone ?? null),
    user: hide('CONTACT_DETAILS') ? null : (candidate.user ?? null),
    alias: nameHidden ? candidateAlias(context.applicationId, context.applicationReference) : null,
    anonymised: true,
    hiddenFields: [...policy.hidden],
  }
}

/**
 * Strip identifying text out of free-form content such as a motivation
 * statement, which would otherwise leak the name the rest of the screen hides.
 */
export function redactFreeText(text: string | null | undefined, candidate: AnonymisableCandidate, policy: AnonymisationPolicy) {
  if (!text || !policy.enabled || !policy.hidden.has('NAME')) return text ?? null
  const names = [candidate.legalFirstName, candidate.middleName, candidate.lastName, candidate.preferredName]
    .filter((value): value is string => Boolean(value && value.trim().length > 2))
    .map((value) => value.trim())
  let output = text
  for (const name of names) {
    output = output.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[name removed]')
  }
  if (policy.hidden.has('CONTACT_DETAILS')) {
    output = output
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]')
      .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/g, '[phone removed]')
  }
  return output
}

/**
 * §28.3 Anonymisation applies to early review only. Once a candidate reaches
 * interview, references or offer, identity is unavoidable and hiding it would
 * obstruct the process rather than reduce bias.
 */
const ANONYMISED_STAGES = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'EXCEPTION_REVIEW',
  'LONGLISTED',
  'NOT_LONGLISTED',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
])

export function stageAllowsAnonymisation(internalStatus: string): boolean {
  return ANONYMISED_STAGES.has(internalStatus)
}
