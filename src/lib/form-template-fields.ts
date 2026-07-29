export const FORM_FIELD_TYPES = [
  'text',
  'longtext',
  'date',
  'number',
  'yesno',
  'select',
  'multiselect',
  'declaration',
] as const

export type FormTemplateField = {
  name: string
  label: string
  type: (typeof FORM_FIELD_TYPES)[number]
  required: boolean
  helpText?: string
  options?: string[]
}
