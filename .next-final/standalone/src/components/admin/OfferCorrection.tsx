'use client'

import { useState } from 'react'
import { PencilLine, Loader2 } from 'lucide-react'

/**
 * Correct the terms of an offer that has not yet been accepted.
 *
 * The endpoint supersedes the original offer and raises a fresh independent
 * approval rather than editing in place, so the corrected terms go through the
 * same control as the original. It had no UI, which meant a typo in a salary or
 * start date could only be fixed by withdrawing and starting again.
 */

const CORRECTABLE = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED']

export default function OfferCorrection({
  offerId,
  status,
  current,
}: {
  offerId: string
  status: string
  current: {
    position: string
    salary: string
    startDate: string
    endDate: string | null
    acceptanceDeadline: string
    probationPeriod: string | null
    reportingLine: string | null
    conditions: string | null
    contractDuration: string | null
  }
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    position: current.position,
    salary: current.salary,
    startDate: current.startDate.slice(0, 10),
    endDate: current.endDate?.slice(0, 10) ?? '',
    acceptanceDeadline: current.acceptanceDeadline.slice(0, 10),
    probationPeriod: current.probationPeriod ?? '',
    reportingLine: current.reportingLine ?? '',
    conditions: current.conditions ?? '',
    contractDuration: current.contractDuration ?? '',
  })

  if (!CORRECTABLE.includes(status)) return null

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: form.position,
          salary: form.salary,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          // End of day, matching how the create form treats the deadline.
          acceptanceDeadline: new Date(`${form.acceptanceDeadline}T23:59:59.999`).toISOString(),
          probationPeriod: form.probationPeriod || null,
          reportingLine: form.reportingLine || null,
          conditions: form.conditions || null,
          contractDuration: form.contractDuration || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || 'Could not correct the offer')
        return
      }
      setMessage('Corrected offer created and sent for independent approval.')
      setTimeout(() => window.location.reload(), 900)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700"
      >
        <PencilLine className="h-3.5 w-3.5" aria-hidden /> Correct terms
      </button>
    )
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
      />
    </label>
  )

  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-950">Correct offer terms</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-slate-600">
          Cancel
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        This supersedes the current offer and raises a new independent approval. The candidate is not notified until the
        corrected offer is approved and sent.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {field('position', 'Position')}
        {field('salary', 'Approved compensation')}
        {field('contractDuration', 'Contract duration')}
        {field('startDate', 'Start date', 'date')}
        {field('endDate', 'End date', 'date')}
        {field('acceptanceDeadline', 'Acceptance deadline', 'date')}
        {field('probationPeriod', 'Probation period')}
        {field('reportingLine', 'Reports to')}
        <label className="text-xs font-semibold text-slate-700 md:col-span-2 xl:col-span-3">
          Conditions
          <textarea
            rows={2}
            value={form.conditions}
            onChange={(event) => setForm((current) => ({ ...current, conditions: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || !form.position || !form.salary || !form.startDate || !form.acceptanceDeadline}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        Supersede and send for approval
      </button>

      {message && (
        <p role="status" className="mt-2 text-xs font-semibold text-slate-800">
          {message}
        </p>
      )}
    </div>
  )
}
