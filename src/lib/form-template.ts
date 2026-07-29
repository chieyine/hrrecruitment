import { AuthzError } from '@/lib/authz'
import { FORM_FIELD_TYPES, type FormTemplateField } from '@/lib/form-template-fields'

export function validateFormSchema(schemaJson: unknown) {
  if (typeof schemaJson !== 'string' || schemaJson.length > 100_000)
    throw new AuthzError('Form configuration is missing or too large', 422)
  let schema: unknown
  try {
    schema = JSON.parse(schemaJson)
  } catch {
    throw new AuthzError('Form configuration is invalid', 422)
  }
  const fields = (schema as { fields?: unknown })?.fields
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 50)
    throw new AuthzError('A form must contain between 1 and 50 fields', 422)
  const names = new Set<string>()
  for (const value of fields) {
    if (!value || typeof value !== 'object') throw new AuthzError('Every form field must be configured', 422)
    const field = value as Partial<FormTemplateField>
    if (!field.name || !/^[a-z][a-zA-Z0-9_]{0,49}$/.test(field.name))
      throw new AuthzError('Every form field needs a stable name beginning with a lowercase letter', 422)
    if (names.has(field.name)) throw new AuthzError(`Form field names must be unique: ${field.name}`, 422)
    names.add(field.name)
    if (!field.label || field.label.trim().length < 2 || field.label.length > 160)
      throw new AuthzError(`Give ${field.name} a clear label`, 422)
    if (!field.type || !FORM_FIELD_TYPES.includes(field.type))
      throw new AuthzError(`Choose a supported field type for ${field.label}`, 422)
    if (field.helpText && field.helpText.length > 500)
      throw new AuthzError(`Help text for ${field.label} is too long`, 422)
    if (field.type === 'select' || field.type === 'multiselect') {
      const options = field.options?.map((option) => option.trim()).filter(Boolean) || []
      if (options.length < 2 || options.length > 50 || new Set(options).size !== options.length)
        throw new AuthzError(`${field.label} needs between 2 and 50 unique choices`, 422)
      field.options = options
    } else {
      delete field.options
    }
    field.label = field.label.trim()
    field.helpText = field.helpText?.trim() || undefined
    field.required = Boolean(field.required)
  }
  return JSON.stringify({ fields })
}
