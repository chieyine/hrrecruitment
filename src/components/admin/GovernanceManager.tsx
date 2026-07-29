'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileLock2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatDateTime } from '@/lib/utils'

type View = 'ASSURANCE' | 'HOLDS' | 'ACCESS' | 'RETENTION'
type UserOption = { id: string; email: string; reviewerEligible: boolean }
type GovernanceData = {
  legalHolds: any[]
  retentionRuns: any[]
  accessReviews: any[]
  deadLetters: any[]
  operationalEvents: any[]
  users: UserOption[]
  auditIntegrity: { valid?: boolean; checked?: number; error?: string }
}

const initialData: GovernanceData = {
  legalHolds: [],
  retentionRuns: [],
  accessReviews: [],
  deadLetters: [],
  operationalEvents: [],
  users: [],
  auditIntegrity: {},
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'border-amber-200 bg-amber-50 text-amber-800',
  RELEASED: 'border-stone-200 bg-stone-100 text-stone-700',
  PENDING: 'border-blue-200 bg-blue-50 text-blue-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CHANGES_REQUIRED: 'border-rose-200 bg-rose-50 text-rose-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-800',
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase())
}

export default function GovernanceManager() {
  const [data, setData] = useState<GovernanceData>(initialData)
  const [view, setView] = useState<View>('ASSURANCE')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdForm, setHoldForm] = useState({ resourceType: 'APPLICATION', resourceId: '', reason: '' })
  const [releaseHold, setReleaseHold] = useState<any>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({ userId: '', reviewerUserId: '', dueAt: '' })
  const [reviewDecision, setReviewDecision] = useState<any>(null)
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'CHANGES_REQUIRED' | 'COMPLETED'>('APPROVED')
  const [decisionComment, setDecisionComment] = useState('')
  const [retryOpen, setRetryOpen] = useState(false)
  const [resolveEvent, setResolveEvent] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/admin/governance')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Governance records could not be loaded.')
      setData({ ...initialData, ...body })
    } catch (cause) {
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'Governance records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const action = async (payload: Record<string, unknown>, successMessage: string) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The action could not be completed.')
      setMessage(successMessage)
      setError(false)
      await load()
      return true
    } catch (cause) {
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'The action could not be completed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const activeHolds = data.legalHolds.filter((hold) => hold.status === 'ACTIVE').length
  const pendingReviews = data.accessReviews.filter((review) =>
    ['PENDING', 'CHANGES_REQUIRED'].includes(review.status)
  ).length
  const reviewerOptions = useMemo(() => data.users.filter((user) => user.reviewerEligible), [data.users])

  async function placeHold() {
    if (
      await action(
        { action: 'PLACE_HOLD', ...holdForm, reason: holdForm.reason.trim() },
        'Legal hold placed.'
      )
    ) {
      setHoldOpen(false)
      setHoldForm({ resourceType: 'APPLICATION', resourceId: '', reason: '' })
    }
  }

  async function createReview() {
    if (
      await action(
        {
          action: 'CREATE_ACCESS_REVIEW',
          ...reviewForm,
          dueAt: new Date(`${reviewForm.dueAt}T12:00:00`).toISOString(),
        },
        'Access review assigned.'
      )
    ) {
      setReviewOpen(false)
      setReviewForm({ userId: '', reviewerUserId: '', dueAt: '' })
    }
  }

  async function decideReview() {
    if (!reviewDecision || decisionComment.trim().length < 10) return
    if (
      await action(
        {
          action: 'DECIDE_ACCESS_REVIEW',
          id: reviewDecision.id,
          status: reviewStatus,
          decisionComment: decisionComment.trim(),
        },
        'Access review decision recorded.'
      )
    ) {
      setReviewDecision(null)
      setDecisionComment('')
    }
  }

  const tabs: Array<{ id: View; label: string; count?: number }> = [
    { id: 'ASSURANCE', label: 'Assurance', count: data.operationalEvents.length },
    { id: 'HOLDS', label: 'Legal holds', count: activeHolds },
    { id: 'ACCESS', label: 'Access reviews', count: pendingReviews },
    { id: 'RETENTION', label: 'Retention & delivery', count: data.deadLetters.length },
  ]

  return (
    <section className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Platform assurance</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-navy-950">Governance</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Protect records under hold, certify account access, and review the evidence produced by retention and delivery controls.
        </p>
      </header>

      <div className="grid divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Summary label="Audit chain" value={data.auditIntegrity.valid ? 'Verified' : 'Check required'} good={Boolean(data.auditIntegrity.valid)} />
        <Summary label="Active holds" value={String(activeHolds)} good={activeHolds === 0} />
        <Summary label="Access reviews due" value={String(pendingReviews)} good={pendingReviews === 0} />
        <Summary label="Undelivered messages" value={String(data.deadLetters.length)} good={data.deadLetters.length === 0} />
      </div>

      <div className="flex gap-6 overflow-x-auto border-b border-stone-200" role="tablist" aria-label="Governance views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`whitespace-nowrap border-b-2 pb-3 text-sm font-semibold ${view === tab.id ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 text-xs text-stone-500">{tab.count}</span>}
          </button>
        ))}
      </div>

      {message && (
        <div
          role={error ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <PageSkeleton />
      ) : view === 'ASSURANCE' ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-start gap-3">
              {data.auditIntegrity.valid ? (
                <ShieldCheck className="h-6 w-6 text-emerald-700" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-rose-700" />
              )}
              <div>
                <h3 className="font-semibold text-navy-950">
                  {data.auditIntegrity.valid ? 'Audit chain verified' : 'Audit chain requires investigation'}
                </h3>
                <p className="mt-1 text-sm text-stone-600">
                  {data.auditIntegrity.checked || 0} linked audit entries checked.
                  {data.auditIntegrity.error ? ` ${data.auditIntegrity.error}` : ''}
                </p>
              </div>
            </div>
          </div>
          <Register
            title="Unresolved operational events"
            empty="No operational events need attention."
            items={data.operationalEvents}
            render={(event) => (
              <div key={event.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className={`text-xs font-bold ${event.severity === 'CRITICAL' ? 'text-rose-700' : event.severity === 'WARNING' ? 'text-amber-700' : 'text-stone-600'}`}>
                  {event.severity}
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-950">{label(event.eventType)}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {event.resourceType ? `${label(event.resourceType)} · ${event.resourceId || 'No reference'} · ` : ''}
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
                <button type="button" onClick={() => setResolveEvent(event)} className="text-sm font-semibold text-brand-800">
                  Mark resolved
                </button>
              </div>
            )}
          />
        </div>
      ) : view === 'HOLDS' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setHoldOpen(true)} className="btn-primary">
              <FileLock2 className="h-4 w-4" /> Place legal hold
            </button>
          </div>
          <Register
            title="Legal hold register"
            empty="No legal holds have been recorded."
            items={data.legalHolds}
            render={(hold) => (
              <div key={hold.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(220px,1fr)_minmax(220px,1.4fr)_150px_auto] sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-navy-950">{label(hold.resourceType)}</p>
                  <p className="mt-1 break-all font-mono text-xs text-stone-500">{hold.resourceId}</p>
                </div>
                <p className="text-sm leading-5 text-stone-700">{hold.reason.split('\nRelease reason:')[0]}</p>
                <div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[hold.status]}`}>
                    {label(hold.status)}
                  </span>
                  <p className="mt-2 text-xs text-stone-500">{formatDate(hold.placedAt)}</p>
                </div>
                {hold.status === 'ACTIVE' && (
                  <button
                    type="button"
                    disabled={!hold.canRelease}
                    title={!hold.canRelease ? 'A different administrator must release this hold' : undefined}
                    onClick={() => setReleaseHold(hold)}
                    className="text-sm font-semibold text-rose-700 disabled:text-stone-400"
                  >
                    Release
                  </button>
                )}
              </div>
            )}
          />
        </div>
      ) : view === 'ACCESS' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setReviewOpen(true)} className="btn-primary">
              Assign review
            </button>
          </div>
          <Register
            title="Access review register"
            empty="No access reviews have been recorded."
            items={data.accessReviews}
            render={(review) => (
              <div key={review.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_150px_auto] sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-navy-950">{review.userEmail}</p>
                  <p className="mt-1 text-xs text-stone-500">{review.roles.length ? review.roles.join(', ') : 'No assigned roles'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500">Reviewer</p>
                  <p className="mt-1 text-sm text-stone-700">{review.reviewerEmail}</p>
                </div>
                <div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[review.status]}`}>
                    {label(review.status)}
                  </span>
                  <p className="mt-2 text-xs text-stone-500">Due {formatDate(review.dueAt)}</p>
                </div>
                {review.canDecide && ['PENDING', 'CHANGES_REQUIRED'].includes(review.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewDecision(review)
                      setReviewStatus(review.status === 'CHANGES_REQUIRED' ? 'COMPLETED' : 'APPROVED')
                    }}
                    className="text-sm font-semibold text-brand-800"
                  >
                    Record decision
                  </button>
                )}
                {review.decisionComment && (
                  <p className="text-sm text-stone-600 sm:col-span-4">
                    <span className="font-semibold text-stone-800">Decision:</span> {review.decisionComment}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-navy-950">Undelivered messages</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Messages appear here only after all automatic delivery attempts fail.
                </p>
              </div>
              <button
                type="button"
                disabled={data.deadLetters.length === 0}
                onClick={() => setRetryOpen(true)}
                className="btn-secondary"
              >
                <RefreshCw className="h-4 w-4" /> Retry all ({data.deadLetters.length})
              </button>
            </div>
            {data.deadLetters.length === 0 ? (
              <p className="mt-5 text-sm text-stone-500">No messages are waiting for manual retry.</p>
            ) : (
              <div className="mt-5 divide-y divide-stone-200 border-t border-stone-200">
                {data.deadLetters.map((message) => (
                  <div key={message.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_100px_160px]">
                    <div>
                      <p className="font-medium text-navy-950">{message.subject || 'Message without subject'}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-rose-700">{message.lastError || 'Delivery failed'}</p>
                    </div>
                    <span className="text-stone-600">{message.attempts}/{message.maximumAttempts} tries</span>
                    <span className="text-stone-500">{formatDateTime(message.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Register
            title="Retention run evidence"
            empty="No retention runs have been recorded."
            items={data.retentionRuns}
            render={(run) => (
              <div key={run.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[170px_120px_1fr]">
                <span className="text-sm text-stone-700">{formatDateTime(run.startedAt)}</span>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[run.status] || STATUS_STYLE.PENDING}`}>
                  {label(run.status)}
                </span>
                <span className="break-all font-mono text-xs text-stone-500">{run.evidenceHash || run.error || 'Evidence pending'}</span>
              </div>
            )}
          />
          <p className="text-xs leading-5 text-stone-500">
            Retention runs automatically on the approved schedule. Use Automation schedules to pause or preview it.
          </p>
        </div>
      )}

      <Dialog open={holdOpen} onClose={() => setHoldOpen(false)} title="Place legal hold">
        <form onSubmit={(event) => { event.preventDefault(); void placeHold() }} className="space-y-4">
          <label>
            <span className="field-label">Record type</span>
            <select
              value={holdForm.resourceType}
              onChange={(event) => setHoldForm({ ...holdForm, resourceType: event.target.value })}
              className="field-control"
            >
              {['APPLICATION', 'CANDIDATE', 'USER', 'NOTIFICATION', 'REFEREE', 'REFERENCE_REQUEST', 'OUTBOX_MESSAGE', 'IDEMPOTENCY_RECORD', 'RATE_LIMIT_BUCKET'].map((type) => (
                <option key={type} value={type}>{label(type)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Record ID *</span>
            <input required value={holdForm.resourceId} onChange={(event) => setHoldForm({ ...holdForm, resourceId: event.target.value })} className="field-control" />
          </label>
          <label>
            <span className="field-label">Reason for hold *</span>
            <textarea required minLength={10} maxLength={2000} rows={4} value={holdForm.reason} onChange={(event) => setHoldForm({ ...holdForm, reason: event.target.value })} className="field-control resize-y" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setHoldOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy || holdForm.reason.trim().length < 10} className="btn-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place hold
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} title="Assign access review">
        <form onSubmit={(event) => { event.preventDefault(); void createReview() }} className="space-y-4">
          <label>
            <span className="field-label">Account to review</span>
            <select required value={reviewForm.userId} onChange={(event) => setReviewForm({ ...reviewForm, userId: event.target.value })} className="field-control">
              <option value="">Select account</option>
              {data.users.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Independent reviewer</span>
            <select required value={reviewForm.reviewerUserId} onChange={(event) => setReviewForm({ ...reviewForm, reviewerUserId: event.target.value })} className="field-control">
              <option value="">Select reviewer</option>
              {reviewerOptions.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Due date</span>
            <input type="date" required min={new Date().toISOString().slice(0, 10)} value={reviewForm.dueAt} onChange={(event) => setReviewForm({ ...reviewForm, dueAt: event.target.value })} className="field-control" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReviewOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy || !reviewForm.userId || !reviewForm.reviewerUserId || !reviewForm.dueAt} className="btn-primary">Assign review</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(reviewDecision)} onClose={() => setReviewDecision(null)} title="Record access decision">
        <form onSubmit={(event) => { event.preventDefault(); void decideReview() }} className="space-y-4">
          {reviewDecision?.status === 'PENDING' && (
            <label>
              <span className="field-label">Decision</span>
              <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)} className="field-control">
                <option value="APPROVED">Access is appropriate</option>
                <option value="CHANGES_REQUIRED">Changes required</option>
              </select>
            </label>
          )}
          <label>
            <span className="field-label">Evidence and decision *</span>
            <textarea required minLength={10} maxLength={2000} rows={4} value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} className="field-control resize-y" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReviewDecision(null)} className="btn-secondary">Cancel</button>
            <button disabled={busy || decisionComment.trim().length < 10} className="btn-primary">Record decision</button>
          </div>
        </form>
      </Dialog>

      <ReasonDialog
        open={Boolean(releaseHold)}
        onClose={() => setReleaseHold(null)}
        onConfirm={async (reason) => {
          if (await action({ action: 'RELEASE_HOLD', id: releaseHold.id, reason }, 'Legal hold released.')) setReleaseHold(null)
        }}
        title="Release legal hold"
        description="A different administrator must explain why the hold no longer applies."
        confirmLabel="Release hold"
        reasonLabel="Release reason"
        reasonRequired
        tone="danger"
        busy={busy}
      />
      <ReasonDialog
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        onConfirm={async (reason) => {
          if (await action({ action: 'RETRY_DEAD_LETTERS', reason }, 'Undelivered messages returned to the delivery queue.')) setRetryOpen(false)
        }}
        title="Retry undelivered messages"
        description={`This returns ${data.deadLetters.length} messages to the delivery queue. Confirm that the delivery issue has been addressed.`}
        confirmLabel="Retry messages"
        reasonLabel="Reason for retry"
        reasonRequired
        busy={busy}
      />
      <ReasonDialog
        open={Boolean(resolveEvent)}
        onClose={() => setResolveEvent(null)}
        onConfirm={async (reason) => {
          if (await action({ action: 'RESOLVE_EVENT', id: resolveEvent.id, reason }, 'Operational event resolved.')) setResolveEvent(null)
        }}
        title="Resolve operational event"
        description="Record what was checked or corrected before closing the event."
        confirmLabel="Mark resolved"
        reasonLabel="Resolution evidence"
        reasonRequired
        busy={busy}
      />
    </section>
  )
}

function Summary({ label: title, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <p className={`mt-1 text-xl font-semibold ${good ? 'text-emerald-800' : 'text-amber-800'}`}>{value}</p>
    </div>
  )
}

function Register({ title, empty, items, render }: { title: string; empty: string; items: any[]; render: (item: any) => React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <h3 className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-sm font-semibold text-navy-950">{title}</h3>
      {items.length === 0 ? <p className="px-5 py-8 text-sm text-stone-500">{empty}</p> : <div className="divide-y divide-stone-200">{items.map(render)}</div>}
    </section>
  )
}
