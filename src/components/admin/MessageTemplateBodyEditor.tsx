'use client'

import { MESSAGE_VARIABLES } from '@/lib/message-template-fields'

function renderSample(value: string) {
  const samples = new Map(MESSAGE_VARIABLES.map((variable) => [variable.key, variable.sample]))
  return value.replace(/\{\{([a-z_]+)\}\}/gi, (token, key) => samples.get(key as any) || token)
}

export default function MessageTemplateBodyEditor({
  value,
  subject,
  onChange,
}: {
  value: string
  subject: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <textarea
        required
        minLength={20}
        maxLength={10000}
        rows={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control resize-y"
        placeholder="Write the message as the candidate should receive it."
      />
      <div>
        <p className="text-xs font-semibold text-stone-700">Insert candidate or vacancy details</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MESSAGE_VARIABLES.map((variable) => (
            <button
              key={variable.key}
              type="button"
              onClick={() => onChange(`${value}${value && !value.endsWith(' ') ? ' ' : ''}{{${variable.key}}}`)}
              className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-brand-300 hover:text-brand-800"
            >
              {variable.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Candidate preview</p>
        <p className="mt-2 text-sm font-semibold text-navy-950">{renderSample(subject) || 'Message subject'}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">
          {renderSample(value) || 'The message preview will appear here.'}
        </p>
      </div>
    </div>
  )
}
