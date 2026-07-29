import { AuthzError } from '@/lib/authz'

const CATEGORIES = ['CODE_OF_CONDUCT', 'SAFEGUARDING', 'PSEA', 'CONFIDENTIALITY', 'DATA_PROTECTION', 'ICT']
const METHODS = ['ACKNOWLEDGE', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'UPLOAD_SIGNED']

export function validatePolicyValues(values: Record<string, any>) {
  if (values.title !== undefined && (values.title.length < 3 || values.title.length > 200))
    throw new AuthzError('Policy title must be between 3 and 200 characters', 422)
  if (values.summary !== undefined && (values.summary.length < 20 || values.summary.length > 2000))
    throw new AuthzError('Candidate summary must be between 20 and 2,000 characters', 422)
  if (values.category !== undefined && !CATEGORIES.includes(values.category))
    throw new AuthzError('Choose a valid policy category', 422)
  if (values.acknowledgementMethod !== undefined && !METHODS.includes(values.acknowledgementMethod))
    throw new AuthzError('Choose a valid acknowledgement method', 422)
}
