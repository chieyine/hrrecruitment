/**
 * Internal candidate identity (End_to_End.md §28.8).
 *
 * An internal candidate is a member of staff applying for a vacancy. They hold
 * the ordinary CANDIDATE role while applying — recruitment roles say what
 * someone does *in* the recruitment system, not whether they work here — so the
 * organisation's email domain is what distinguishes them.
 *
 * Two rules make this safe to rely on:
 *   - the address must be verified, otherwise anyone could claim staff status by
 *     typing a colleague's domain at registration;
 *   - the domain must match exactly, so `fradfoundation.org.attacker.com` and
 *     `not-fradfoundation.org` are both rejected.
 */

const DEFAULT_INTERNAL_DOMAINS = ['fradfoundation.org']

/**
 * Configurable so a second or renamed domain does not require a code change.
 * `INTERNAL_EMAIL_DOMAINS` is a comma-separated list.
 */
export function internalEmailDomains(): string[] {
  const configured = process.env.INTERNAL_EMAIL_DOMAINS
  const domains = configured
    ? configured
        .split(',')
        .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean)
    : DEFAULT_INTERNAL_DOMAINS
  return domains.length ? domains : DEFAULT_INTERNAL_DOMAINS
}

/** The domain part of an address, or null if it is not a single well-formed address. */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null
  const trimmed = email.trim().toLowerCase()
  // Reject anything with more than one @ rather than taking the last part:
  // "a@b@fradfoundation.org" is not a valid address and must not pass.
  const parts = trimmed.split('@')
  if (parts.length !== 2) return null
  const [local, domain] = parts
  if (!local || !domain || !domain.includes('.')) return null
  return domain
}

/**
 * True when the address belongs to the organisation. Exact domain match only —
 * a subdomain must be listed explicitly if it should count.
 */
export function isInternalEmail(email: string | null | undefined): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  return internalEmailDomains().includes(domain)
}

export interface InternalIdentityInput {
  email: string
  emailVerifiedAt?: Date | string | null
}

/**
 * Whether a signed-in user may see and apply for internal vacancies.
 *
 * Verification is required. An unverified address proves nothing, and internal
 * vacancies are frequently promotions or restructures that should not be
 * visible outside the organisation.
 */
export function isInternalCandidate(user: InternalIdentityInput | null | undefined): boolean {
  if (!user) return false
  if (!user.emailVerifiedAt) return false
  return isInternalEmail(user.email)
}

/**
 * The vacancy audiences a viewer may see (§28.8).
 *
 * Anonymous visitors and external candidates see public roles. Staff — whether
 * they are browsing as a recruiter or applying as an internal candidate — also
 * see internal ones.
 */
export function visibleAudiencesFor(user: InternalIdentityInput | null | undefined): string[] {
  return isInternalCandidate(user) ? ['PUBLIC', 'INTERNAL', 'BOTH'] : ['PUBLIC', 'BOTH']
}

/**
 * Guard for the apply path. Returns a reason when an internal vacancy is being
 * applied for by someone outside the organisation, so the caller can respond
 * with something meaningful rather than a bare 404.
 */
export function internalApplicationBlockReason(
  vacancyAudience: string,
  user: InternalIdentityInput | null | undefined
): string | null {
  if (vacancyAudience !== 'INTERNAL') return null
  if (isInternalCandidate(user)) return null
  if (user && isInternalEmail(user.email))
    return 'Verify your work email address before applying for an internal vacancy'
  return 'This vacancy is open to current staff only'
}
