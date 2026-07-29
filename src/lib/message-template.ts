import { AuthzError } from '@/lib/authz'
import { MESSAGE_VARIABLES } from '@/lib/message-template-fields'

const allowed = new Set<string>(MESSAGE_VARIABLES.map((variable) => variable.key))

export function validateMessageTemplate(values: Record<string, any>) {
  if (values.code !== undefined && !/^[A-Z0-9][A-Z0-9_]{2,59}$/.test(values.code))
    throw new AuthzError('Use 3–60 uppercase letters, numbers or underscores for the template code', 422)
  if (values.subject !== undefined && (values.subject.length < 3 || values.subject.length > 200))
    throw new AuthzError('Subject must be between 3 and 200 characters', 422)
  if (values.bodyTemplate !== undefined && (values.bodyTemplate.length < 20 || values.bodyTemplate.length > 10_000))
    throw new AuthzError('Message must be between 20 and 10,000 characters', 422)
  for (const field of ['subject', 'bodyTemplate']) {
    if (values[field] === undefined) continue
    const variables = [...String(values[field]).matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1])
    const unknown = variables.find((variable) => !allowed.has(variable))
    if (unknown) throw new AuthzError(`Unsupported message variable: {{${unknown}}}`, 422)
  }
}
