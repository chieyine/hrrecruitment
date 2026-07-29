'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileLock2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toaster'

type RequestStatus = 'PENDING' | 'LEGAL_REVIEW' | 'COMPLETED' | 'REJECTED'

type PrivacyRequest = {
  id: string
  status: RequestStatus
  requestedAt: string
  decidedAt: string | null
  candidateName: string
  email: string
  accountStatus: string
  candidateReason: string | null
  reviewNote: string | null
  applicationCount: number
  successfulRecord: boolean
  activeLegalHold: boolean
  requiresDifferentReviewer: boolean
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'New',
  LEGAL_REVIEW: 'Independent review',
  COMPLETED: 'Completed',
  REJECTED: 'Declined',
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  LEGAL_REVIEW: 'border-blue-200 bg-blue-50 text-blue-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-stone-200 bg-stone-100 text-stone-700',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PrivacyRequestManager() {
  const { toast } = useToast()
  const [items, setItems] = useState<PrivacyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [pending, setPending] = useState<{ item: PrivacyRequest; decision: 'APPROVE' | 'REJECT' } | null>(null)
  const [reason, setReason] = useState('')
  const [retentionConfirmed, setRetentionConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const response = await fetch('/api/admin/deletion-requests')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Privacy requests could not be loaded.')
      setItems(data.requests || [])
    } catch (error) {
      setLoadError(true)
      toast('error', error instanceof Error ? error.message : 'Privacy requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        view === 'OPEN' ? item.status === 'PENDING' || item.status === 'LEGAL_REVIEW' : item.status === 'COMPLETED' || item.status === 'REJECTED'
      ),
    [items, view]
  )

  const closeDialog = () => {
    if (saving) return
    setPending(null)
    setReason('')
    setRetentionConfirmed(false)
  }

  const decide = async () => {
    if (!pending || reason.trim().length < 10) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/deletion-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pending.item.id,
          decision: pending.decision,
          reason: reason.trim(),
          legalOverride: pending.item.status === 'LEGAL_REVIEW' && retentionConfirmed,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The decision could not be saved.')
      toast(
        'success',
        data.pendingIndependentApproval
          ? 'Sent for independent retention review.'
          : pending.decision === 'APPROVE'
            ? 'Personal data anonymized.'
            : 'Request declined.'
      )
      setPending(null)
      setReason('')
      setRetentionConfirmed(false)
      await load()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'The decision could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const openCount = items.filter((item) => item.status === 'PENDING' || item.status === 'LEGAL_REVIEW').length

  return (
    <section className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Privacy casework</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-navy-950">Account closure requests</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Review a candidate’s request, check the recruitment record and record the basis for the decision. Approved
          requests remove personal data while retaining the minimum audit record.
        </p>
      </header>

      <div className="flex items-center justify-between border-b border-stone-200">
        <div className="flex gap-6" role="tablist" aria-label="Privacy request status">
          {[
            { id: 'OPEN' as const, label: 'Needs review', count: openCount },
            { id: 'CLOSED' as const, label: 'Decided', count: items.length - openCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => setView(tab.id)}
              className={`border-b-2 px-0.5 pb-3 text-sm font-semibold ${
                view === tab.id ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label} <span className="ml-1 text-xs tabular-nums text-stone-500">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="font-semibold text-rose-900">Privacy requests could not be loaded.</p>
          <button type="button" onClick={() => void load()} className="mt-3 text-sm font-semibold text-rose-800 underline">
            Try again
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-stone-400" />
          <p className="mt-3 font-semibold text-navy-900">
            {view === 'OPEN' ? 'No requests need review' : 'No decisions have been recorded'}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {view === 'OPEN' ? 'New account closure requests will appear here.' : 'Completed and declined requests will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_150px_130px] gap-5 border-b border-stone-200 bg-stone-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 md:grid">
            <span>Candidate</span>
            <span>Record check</span>
            <span>Requested</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-stone-200">
            {visibleItems.map((item) => (
              <article key={item.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_150px_130px] md:gap-5">
                <div>
                  <p className="font-semibold text-navy-950">{item.candidateName}</p>
                  <p className="mt-0.5 break-all text-sm text-stone-600">{item.email}</p>
                  {item.candidateReason && (
                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-stone-600">“{item.candidateReason}”</p>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-stone-600">
                  <p>{item.applicationCount} recruitment {item.applicationCount === 1 ? 'record' : 'records'}</p>
                  {item.successfulRecord && (
                    <p className="flex items-start gap-1.5 font-medium text-amber-800">
                      <FileLock2 className="mt-0.5 h-4 w-4 shrink-0" /> Successful appointment on file
                    </p>
                  )}
                  {item.activeLegalHold && (
                    <p className="flex items-start gap-1.5 font-medium text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Active legal hold
                    </p>
                  )}
                  {item.status === 'LEGAL_REVIEW' && item.requiresDifferentReviewer && (
                    <p className="flex items-start gap-1.5 font-medium text-blue-800">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> Waiting for another administrator
                    </p>
                  )}
                </div>
                <div className="text-sm text-stone-600">
                  <p>{formatDate(item.requestedAt)}</p>
                  {item.decidedAt && <p className="mt-1 text-xs">Decided {formatDate(item.decidedAt)}</p>}
                </div>
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  {(item.status === 'PENDING' || item.status === 'LEGAL_REVIEW') && (
                    <div className="mt-3 flex flex-col items-start gap-2">
                      <button
                        type="button"
                        disabled={item.activeLegalHold || (item.status === 'LEGAL_REVIEW' && item.requiresDifferentReviewer)}
                        onClick={() => setPending({ item, decision: 'APPROVE' })}
                        className="text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4 disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline"
                      >
                        {item.status === 'LEGAL_REVIEW' ? 'Complete review' : item.successfulRecord ? 'Start retention review' : 'Approve closure'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPending({ item, decision: 'REJECT' })}
                        className="text-sm font-semibold text-stone-600 hover:text-rose-700"
                      >
                        Decline request
                      </button>
                    </div>
                  )}
                </div>
                {item.reviewNote && (
                  <p className="text-sm leading-5 text-stone-600 md:col-span-4">
                    <span className="font-semibold text-stone-800">Decision note:</span> {item.reviewNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={pending !== null}
        onClose={closeDialog}
        title={
          pending?.decision === 'REJECT'
            ? 'Decline account closure'
            : pending?.item.status === 'LEGAL_REVIEW'
              ? 'Complete retention review'
              : pending?.item.successfulRecord
                ? 'Start independent retention review'
                : 'Approve account closure'
        }
        tone={pending?.decision === 'REJECT' || (pending?.decision === 'APPROVE' && !pending?.item.successfulRecord) ? 'danger' : 'default'}
      >
        {pending && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void decide()
            }}
          >
            <p className="text-sm leading-6 text-stone-600">
              {pending.decision === 'REJECT'
                ? 'Explain why the request cannot be completed. This explanation will be sent to the candidate.'
                : pending.item.status === 'LEGAL_REVIEW'
                  ? 'Confirm that retention requirements have been checked and permit anonymization. This action cannot be undone.'
                  : pending.item.successfulRecord
                    ? 'This record relates to a successful appointment. A different administrator must confirm the retention decision before any data is removed.'
                    : 'Personal data and uploaded files will be removed. The minimum recruitment audit record will remain.'}
            </p>
            {pending.decision === 'APPROVE' && pending.item.status === 'LEGAL_REVIEW' && (
              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
                <input
                  type="checkbox"
                  checked={retentionConfirmed}
                  onChange={(event) => setRetentionConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400"
                  required
                />
                I have independently checked the retention requirement and confirm that this record may be anonymized.
              </label>
            )}
            <div>
              <label htmlFor="privacy-decision-reason" className="field-label">
                {pending.decision === 'REJECT' ? 'Explanation to candidate' : 'Decision note'} *
              </label>
              <textarea
                id="privacy-decision-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
                rows={4}
                required
                className="field-control resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDialog} disabled={saving} className="btn-secondary min-h-10 px-4 py-2">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || reason.trim().length < 10 || (pending.item.status === 'LEGAL_REVIEW' && pending.decision === 'APPROVE' && !retentionConfirmed)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  pending.decision === 'REJECT' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-brand-800 hover:bg-brand-900'
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : pending.decision === 'REJECT' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {pending.decision === 'REJECT'
                  ? 'Decline request'
                  : pending.item.status === 'LEGAL_REVIEW'
                    ? 'Confirm and anonymize'
                    : pending.item.successfulRecord
                      ? 'Send for review'
                      : 'Anonymize data'}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  )
}
