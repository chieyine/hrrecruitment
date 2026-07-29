'use client'

import { OFFER_VARIABLES } from '@/lib/offer-template-fields'

function sample(value: string) {
  const values = new Map(OFFER_VARIABLES.map((variable) => [variable.key, variable.sample]))
  return value.replace(/\{\{([a-z_]+)\}\}/gi, (token, key) => values.get(key as any) || token)
}

export default function OfferTemplateBodyEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-stone-600">
        Write the letter’s opening and sign-off. The reference, candidate, key terms, response deadline and FRAD
        document footer are added to the PDF automatically.
      </p>
      <textarea
        required
        minLength={80}
        maxLength={8000}
        rows={12}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control resize-y font-mono text-xs leading-6"
        placeholder={'Dear {{candidate_name}},\n\nWe are writing to offer you...'}
      />
      <div>
        <p className="text-xs font-semibold text-stone-700">Insert approved offer details</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {OFFER_VARIABLES.map((variable) => (
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
      <div className="mx-auto max-w-xl overflow-hidden rounded-sm border border-stone-300 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <div className="bg-navy-950 px-7 py-5 text-white">
          <p className="text-sm font-bold tracking-wide">FRAD FOUNDATION</p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Recruitment · Confidential
          </p>
        </div>
        <div className="min-h-[30rem] px-8 py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">PDF preview</p>
          <h3 className="mt-3 text-xl font-semibold text-navy-950">Offer of employment</h3>
          <p className="mt-1 text-xs text-stone-500">Amina Yusuf · Programme Officer</p>
          <div className="mt-7 whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {sample(value) || 'Your offer wording will appear here.'}
          </div>
          <div className="mt-7 border-t border-stone-200 pt-5">
            <p className="text-xs font-bold text-navy-950">Key terms</p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Duty station · Contract · Compensation · Start and end dates · Probation · Reporting line
            </p>
          </div>
        </div>
        <div className="border-t border-stone-200 px-8 py-3 text-[9px] text-stone-500">
          FRAD Foundation · Confidential candidate document
        </div>
      </div>
    </div>
  )
}
