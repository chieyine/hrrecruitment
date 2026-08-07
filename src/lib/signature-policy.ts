import { createHash } from 'crypto'

/**
 * Signature policy and hashing (End_to_End.md §28.10).
 *
 * Deliberately free of database imports so the rules that decide *what counts as
 * a signature* and *what a signature is taken over* can be unit-tested on their
 * own. `lib/signatures.ts` adds persistence on top of this.
 */

export const SIGNABLE_RESOURCE_TYPES = [
  'STAFFING_REQUEST',
  'VACANCY_APPROVAL',
  'CONFLICT_DECLARATION',
  'SHORTLIST_APPROVAL',
  'INTERVIEW_SCORECARD',
  'SELECTION_RECOMMENDATION',
  'REFERENCE_FORM',
  'OFFER_APPROVAL',
  'CONDITIONAL_OFFER',
  'FINAL_OFFER',
  'CANDIDATE_ACCEPTANCE',
  'PREEMPLOYMENT_DECLARATION',
  'ERP_TRANSFER_APPROVAL',
  'RECRUITMENT_CLOSURE',
  'FUNDING_CONFIRMATION',
  'LONGLIST_APPROVAL',
] as const

export type SignableResourceType = (typeof SIGNABLE_RESOURCE_TYPES)[number]

export const SIGNATURE_METHODS = ['TYPED_NAME', 'DRAWN_SIGNATURE', 'UPLOADED_PDF', 'APPROVAL_CLICK'] as const
export type SignatureMethod = (typeof SIGNATURE_METHODS)[number]

/**
 * Signatures that carry legal, financial or safeguarding weight.
 *
 * For these the signature *is* the record of authority. If it cannot be written
 * the decision must not stand, so the whole action is rolled back rather than
 * left as an approval nobody is provably accountable for.
 *
 * Everything else — an informational acknowledgement, for instance — still
 * records a signature, but a failure there is logged rather than fatal.
 */
export const CRITICAL_SIGNATURE_TYPES = new Set<SignableResourceType>([
  'STAFFING_REQUEST',
  'VACANCY_APPROVAL',
  'FUNDING_CONFIRMATION',
  'SHORTLIST_APPROVAL',
  'LONGLIST_APPROVAL',
  'INTERVIEW_SCORECARD',
  'SELECTION_RECOMMENDATION',
  'OFFER_APPROVAL',
  'CONDITIONAL_OFFER',
  'FINAL_OFFER',
  'CANDIDATE_ACCEPTANCE',
  'ERP_TRANSFER_APPROVAL',
  'RECRUITMENT_CLOSURE',
])

export function isCriticalSignature(resourceType: string): boolean {
  return CRITICAL_SIGNATURE_TYPES.has(resourceType as SignableResourceType)
}

/** Raised when a signature that must be captured could not be written. */
export class SignatureRequiredError extends Error {
  readonly status = 503
  constructor(resourceType: string) {
    super(
      `This decision could not be signed (${resourceType}). Nothing has been saved — try again, and contact an administrator if it persists.`
    )
    this.name = 'SignatureRequiredError'
  }
}

/**
 * Canonical JSON so the same logical payload always hashes identically,
 * regardless of key insertion order. `undefined` members are dropped, which is
 * why a null and an absent field hash differently — that distinction matters
 * when proving what was actually approved.
 */
function canonicalise(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalise(item)}`).join(',')}}`
}

export function hashSignaturePayload(payload: unknown): string {
  return createHash('sha256').update(canonicalise(payload)).digest('hex')
}
