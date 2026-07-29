'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Mail, Search, ShieldAlert } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

interface FraudReport {
  id: string
  referenceNumber: string | null
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
const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'New',
  UNDER_REVIEW: 'Reviewing',
  ACTIONED: 'Action taken',
  DISMISSED: 'Not substantiated',
}
const STATUS_STYLE: Record<string, string> = {
  RECEIVED: 'border-rose-200 bg-rose-50 text-rose-800',
  UNDER_REVIEW: 'border-amber-200 bg-amber-50 text-amber-800',
  ACTIONED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DISMISSED: 'border-stone-200 bg-stone-100 text-stone-700',
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function FraudReportTriage({ canClose }: { canClose: boolean }) {
  const [reports, setReports] = useState<FraudReport[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ report: FraudReport; status: string } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (nextPage = 1) => {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true)
      setMessage('')
      try {
        const params = new URLSearchParams({ page: String(nextPage) })
        if (filter) params.set('status', filter)
        const response = await fetch(`/api/admin/fraud-reports?${params}`)
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Fraud reports could not be loaded.')
        const next = (data.reports || []) as FraudReport[]
        setReports((current) => (nextPage === 1 ? next : [...current, ...next]))
        setCounts(data.countsByStatus ?? {})
        setPage(nextPage)
        setHasMore(Boolean(data.hasMore))
        setSelectedId((current) => current || next[0]?.id || null)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Fraud reports could not be loaded.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filter]
  )

  useEffect(() => {
    setSelectedId(null)
    void load(1)
  }, [load])

  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return reports
    return reports.filter((report) =>
      [report.referenceNumber, report.suspectContact, report.reporterEmail, report.incidentDetails].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    )
  }, [query, reports])
  const selected = visibleReports.find((report) => report.id === selectedId) || visibleReports[0] || null

  const saveDecision = async () => {
    if (!decision || note.trim().length < 10) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/fraud-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: decision.report.id, status: decision.status, triageNote: note.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The case could not be updated.')
      setDecision(null)
      setNote('')
      await load(1)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The case could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  const begin = (report: FraudReport, status: string) => {
    setDecision({ report, status })
    setNote('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 border-b border-stone-200 sm:flex-row sm:items-end">
        <div className="flex gap-5 overflow-x-auto" role="tablist" aria-label="Report status">
          <button
            type="button"
            role="tab"
            aria-selected={!filter}
            onClick={() => setFilter('')}
            className={`whitespace-nowrap border-b-2 pb-3 text-sm font-semibold ${!filter ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}
          >
            All <span className="ml-1 text-xs">{Object.values(counts).reduce((sum, count) => sum + count, 0)}</span>
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-semibold ${filter === status ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}
            >
              {STATUS_LABEL[status]} <span className="ml-1 text-xs">{counts[status] || 0}</span>
            </button>
          ))}
        </div>
        <label className="relative mb-2 block w-full sm:max-w-xs">
          <span className="sr-only">Search loaded reports</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search loaded reports"
            className="field-control pl-9"
          />
        </label>
      </div>

      {message && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-stone-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-stone-400" />
          <p className="mt-3 font-semibold text-navy-900">No reports here</p>
          <p className="mt-1 text-sm text-stone-500">
            {query ? 'No loaded report matches your search.' : 'Reports in this stage will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
          <div className="border-b border-stone-200 lg:border-b-0 lg:border-r">
            <div className="max-h-[680px] divide-y divide-stone-200 overflow-y-auto">
              {visibleReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full px-4 py-4 text-left transition ${selected?.id === report.id ? 'bg-brand-50' : 'hover:bg-stone-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-navy-950">{report.suspectContact}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[report.status]}`}>
                      {STATUS_LABEL[report.status]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{report.incidentDetails}</p>
                  <p className="mt-2 text-[11px] text-stone-400">{formatWhen(report.createdAt)}</p>
                </button>
              ))}
            </div>
            {hasMore && !query && (
              <div className="border-t border-stone-200 p-3">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void load(page + 1)}
                  className="btn-secondary w-full justify-center"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                </button>
              </div>
            )}
          </div>

          {selected && (
            <article className="min-w-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    {selected.referenceNumber || selected.id}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-navy-950">
                    Contact named in report
                  </h2>
                  <p className="mt-1 break-all text-sm font-medium text-stone-700">{selected.suspectContact}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <dl className="grid gap-4 border-b border-stone-200 py-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Received</dt>
                  <dd className="mt-1 text-stone-800">{formatWhen(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Reporter</dt>
                  <dd className="mt-1 text-stone-800">
                    {selected.reporterEmail ? (
                      <span className="inline-flex items-center gap-1.5 break-all">
                        <Mail className="h-4 w-4 text-stone-400" /> {selected.reporterEmail}
                      </span>
                    ) : (
                      'Anonymous'
                    )}
                  </dd>
                </div>
              </dl>

              <section className="py-5">
                <h3 className="text-sm font-semibold text-navy-950">What was reported</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{selected.incidentDetails}</p>
              </section>

              {selected.triageNote && (
                <section className="border-t border-stone-200 py-5">
                  <h3 className="text-sm font-semibold text-navy-950">Latest case note</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{selected.triageNote}</p>
                  {selected.triagedAt && (
                    <p className="mt-2 text-xs text-stone-500">
                      {formatWhen(selected.triagedAt)}
                      {selected.triagedByEmail ? ` · ${selected.triagedByEmail}` : ''}
                    </p>
                  )}
                </section>
              )}

              <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-5">
                {selected.status === 'RECEIVED' && (
                  <button type="button" onClick={() => begin(selected, 'UNDER_REVIEW')} className="btn-primary">
                    <Clock3 className="h-4 w-4" /> Start review
                  </button>
                )}
                {selected.status === 'UNDER_REVIEW' && (
                  <button type="button" onClick={() => begin(selected, 'UNDER_REVIEW')} className="btn-secondary">
                    Update case note
                  </button>
                )}
                {canClose && ['RECEIVED', 'UNDER_REVIEW'].includes(selected.status) && (
                  <>
                    <button type="button" onClick={() => begin(selected, 'ACTIONED')} className="btn-primary">
                      <CheckCircle2 className="h-4 w-4" /> Record action taken
                    </button>
                    <button type="button" onClick={() => begin(selected, 'DISMISSED')} className="btn-secondary">
                      <AlertTriangle className="h-4 w-4" /> Close as not substantiated
                    </button>
                  </>
                )}
                {!canClose && selected.status === 'UNDER_REVIEW' && (
                  <p className="self-center text-sm text-stone-600">Record the facts for HR manager closure.</p>
                )}
              </div>
            </article>
          )}
        </div>
      )}

      <Dialog
        open={decision !== null}
        onClose={() => {
          if (!busy) setDecision(null)
        }}
        title={
          decision?.status === 'UNDER_REVIEW'
            ? 'Start review'
            : decision?.status === 'ACTIONED'
              ? 'Record action taken'
              : 'Close as not substantiated'
        }
        tone={decision?.status === 'DISMISSED' ? 'danger' : 'default'}
      >
        {decision && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void saveDecision()
            }}
          >
            <p className="text-sm leading-6 text-stone-600">
              {decision.status === 'UNDER_REVIEW'
                ? 'Record the first check or the next investigation step.'
                : decision.status === 'ACTIONED'
                  ? 'Record what FRAD verified and the action taken. Do not include passwords or complete payment details.'
                  : 'Explain the checks completed and why the report was not substantiated.'}
            </p>
            <label>
              <span className="field-label">{decision.status === 'UNDER_REVIEW' ? 'Case note' : 'Outcome'} *</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                className="field-control resize-y"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setDecision(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy || note.trim().length < 10} className="btn-primary">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save case
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
