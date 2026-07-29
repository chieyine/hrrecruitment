import { AuthzError } from '@/lib/authz'
import { OFFER_VARIABLES } from '@/lib/offer-template-fields'

const allowed = new Set<string>(OFFER_VARIABLES.map((variable) => variable.key))

export function validateOfferTemplate(values: Record<string, any>) {
  if (values.name !== undefined && (values.name.length < 3 || values.name.length > 160))
    throw new AuthzError('Template name must be between 3 and 160 characters', 422)
  if (
    values.candidateType !== undefined &&
    !['GENERAL', 'CONSULTANT', 'INTERN'].includes(String(values.candidateType))
  )
    throw new AuthzError('Choose employee, consultant or intern', 422)
  if (values.bodyTemplate !== undefined) {
    const body = String(values.bodyTemplate)
    if (body.length < 80 || body.length > 8_000)
      throw new AuthzError('Offer wording must be between 80 and 8,000 characters', 422)
    const variables = [...body.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1])
    const unknown = variables.find((variable) => !allowed.has(variable))
    if (unknown) throw new AuthzError(`Unsupported offer variable: {{${unknown}}}`, 422)
    if (!body.includes('{{candidate_name}}'))
      throw new AuthzError('Offer wording must include the candidate name', 422)
  }
}

export function snapshottedOfferBody(snapshot: string | null | undefined, fallback: string | null | undefined) {
  if (!snapshot) return fallback
  try {
    const parsed = JSON.parse(snapshot)
    return typeof parsed?.bodyTemplate === 'string' ? parsed.bodyTemplate : fallback
  } catch {
    return fallback
  }
}
