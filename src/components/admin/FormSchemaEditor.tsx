'use client'

import { useMemo } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { FORM_FIELD_TYPES, type FormTemplateField } from '@/lib/form-template-fields'

const TYPE_LABELS: Record<(typeof FORM_FIELD_TYPES)[number], string> = {
  text: 'Short answer',
  longtext: 'Long answer',
  date: 'Date',
  number: 'Number',
  yesno: 'Yes or no',
  select: 'One choice',
  multiselect: 'Multiple choices',
  declaration: 'Confirmation',
}

function readFields(value: string): FormTemplateField[] {
  try {
    const parsed = JSON.parse(value || '{"fields":[]}')
    return Array.isArray(parsed.fields) ? parsed.fields : []
  } catch {
    return []
  }
}

function stableName(label: string, index: number) {
  const words = label
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const candidate = words
    .map((word, wordIndex) =>
      wordIndex === 0 ? word.toLowerCase() : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`
    )
    .join('')
    .replace(/^[^a-z]+/, '')
    .slice(0, 50)
  return candidate || `field${index + 1}`
}

export default function FormSchemaEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const fields = useMemo(() => readFields(value), [value])
  const commit = (next: FormTemplateField[]) => onChange(JSON.stringify({ fields: next }))
  const update = (index: number, changes: Partial<FormTemplateField>) =>
    commit(fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...changes } : field)))

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-navy-900">No fields yet</p>
          <p className="mt-1 text-xs text-stone-500">Add only the information FRAD genuinely needs.</p>
        </div>
      )}
      {fields.map((field, index) => {
        const hasOptions = field.type === 'select' || field.type === 'multiselect'
        return (
          <div key={`${field.name}-${index}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="grid gap-3 sm:grid-cols-[20px_minmax(0,1fr)_150px_32px] sm:items-start">
              <GripVertical className="mt-2 h-4 w-4 text-stone-300" aria-hidden="true" />
              <label>
                <span className="field-label">Question or field label</span>
                <input
                  value={field.label || ''}
                  required
                  maxLength={160}
                  onChange={(event) => {
                    const label = event.target.value
                    update(index, { label, name: stableName(label, index) })
                  }}
                  className="field-control"
                />
              </label>
              <label>
                <span className="field-label">Answer type</span>
                <select
                  value={field.type || 'text'}
                  onChange={(event) =>
                    update(index, {
                      type: event.target.value as FormTemplateField['type'],
                      options: ['select', 'multiselect'].includes(event.target.value)
                        ? field.options || ['Option 1', 'Option 2']
                        : undefined,
                    })
                  }
                  className="field-control"
                >
                  {FORM_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => commit(fields.filter((_, fieldIndex) => fieldIndex !== index))}
                aria-label={`Remove ${field.label || `field ${index + 1}`}`}
                className="mt-6 rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 pl-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label>
                <span className="field-label">Help text (optional)</span>
                <input
                  value={field.helpText || ''}
                  maxLength={500}
                  onChange={(event) => update(index, { helpText: event.target.value })}
                  className="field-control"
                  placeholder="Add context only where the candidate may need it."
                />
              </label>
              <label className="mt-6 flex min-h-10 items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) => update(index, { required: event.target.checked })}
                  className="h-4 w-4 rounded border-stone-300"
                />
                Answer required
              </label>
            </div>
            {hasOptions && (
              <label className="mt-3 block pl-5">
                <span className="field-label">Choices</span>
                <textarea
                  value={(field.options || []).join('\n')}
                  onChange={(event) =>
                    update(index, { options: event.target.value.split('\n').map((option) => option.trim()) })
                  }
                  rows={3}
                  className="field-control resize-y"
                  placeholder={'One choice per line'}
                />
              </label>
            )}
            <p className="mt-2 pl-5 text-[11px] text-stone-400">Stored as {field.name || `field${index + 1}`}</p>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() =>
          commit([
            ...fields,
            { name: `field${fields.length + 1}`, label: '', type: 'text', required: false },
          ])
        }
        className="btn-secondary min-h-10 px-3 py-2"
      >
        <Plus className="h-4 w-4" /> Add field
      </button>
    </div>
  )
}
