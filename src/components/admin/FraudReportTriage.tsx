'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, Loader2, Mail, Clock } from 'lucide-react'

interface FraudReport {
  id: string
  suspectContact: string
  incidentDetails: string
  reporterEmail: string | null
  status: string
  triageNote: string | null
  triagedByEmail: string | null
  triagedAt: string | null
  createdAt: string
}

const STATUSES = ['RECEIVED', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED'] as const

const STATUS_STYLE: Record<string, string> = {
  RECEIVED: 'bg-rose-50 text-rose-800',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800',
  ACTIONED: 'bg-emerald-50 text-emerald-800',
  DISMISSED: 'bg-slate-100 text-slate-700',
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FraudReportTriage() {
  const [reports, setReports] = useState<FraudReport[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { status: string; triageNote: string }>>({})
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/fraud-reports${filter ? `?status=${filter}` : ''}`)
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Could not load reports')
        return
      }
      setReports(data.reports)
      setCounts(data.countsByStatus ?? {})
      setDrafts(
        Object.fromEntries(
          (data.reports as FraudReport[]).map((report) => [
            report.id,
            { status: report.status, triageNote: report.triageNote ?? '' },
          ])
        )
      )
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (id: string) => {
    setBusy(id)
    setMessage('')
    try {
      const response = await fetch('/api/admin/fraud-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...drafts[id] }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Could not update the report')
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === '' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
        >
          All
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === status ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
          >
            {status.replaceAll('_', ' ')}
            {counts[status] ? <span className="ml-1.5 text-[10px]">({counts[status]})</span> : null}
          </button>
        ))}
      </div>

      {message && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {message}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading reports…
        </p>
      ) : reports.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No fraud reports {filter ? `with status ${filter.replaceAll('_', ' ').toLowerCase()}` : 'have been received'}.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950">
                    <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden />
                    Reported contact: <span className="font-mono">{report.suspectContact}</span>
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {formatWhen(report.createdAt)}
                    </span>
                    {report.reporterEmail ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" aria-hidden /> {report.reporterEmail}
                      </span>
                    ) : (
                      <span className="italic">reported anonymously</span>
                    )}
                    <span className="font-mono text-[10px]">{report.id}</span>
                  </p>
                </div>
                <span className={`status-chip ${STATUS_STYLE[report.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {report.status.replaceAll('_', ' ')}
                </span>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">What was reported</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{report.incidentDetails}</p>
              </div>

              {report.triagedAt && (
                <p className="mt-2 text-xs text-slate-600">
                  Last triaged {formatWhen(report.triagedAt)}
                  {report.triagedByEmail ? ` by ${report.triagedByEmail}` : ''}
                </p>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Status
                  <select
                    value={drafts[report.id]?.status ?? report.status}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [report.id]: { ...current[report.id], status: event.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Triage decision
                  <input
                    value={drafts[report.id]?.triageNote ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [report.id]: { ...current[report.id], triageNote: event.target.value },
                      }))
                    }
                    placeholder="Required when marking Actioned or Dismissed"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => save(report.id)}
                  disabled={busy === report.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy === report.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Save
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
