'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

const initialData = { legalHolds: [], retentionRuns: [], accessReviews: [], deadLetters: [], operationalEvents: [], users: [], auditIntegrity: {} }

export default function GovernancePage() {
  const [data, setData] = useState<any>(initialData)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdForm, setHoldForm] = useState({ resourceType: 'APPLICATION', resourceId: '', reason: '' })
  const [releaseHold, setReleaseHold] = useState<any>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({ userId: '', reviewerUserId: '', dueAt: '' })
  const [reviewDecision, setReviewDecision] = useState<any>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/governance')
    const body = await response.json()
    if (response.ok) setData(body)
    else setMessage(body.error || 'Could not load governance records.')
  }, [])
  useEffect(() => { void load() }, [load])

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true)
    const response = await fetch('/api/admin/governance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await response.json()
    setMessage(response.ok ? 'Governance action completed.' : body.error || 'Action failed')
    setBusy(false)
    if (response.ok) await load()
    return response.ok
  }

  async function placeHold() {
    if (holdForm.reason.trim().length < 10) {
      setMessage('The legal-hold reason must contain at least ten characters.')
      return
    }
    if (await action({ action: 'PLACE_HOLD', ...holdForm, reason: holdForm.reason.trim() })) {
      setHoldOpen(false)
      setHoldForm({ resourceType: 'APPLICATION', resourceId: '', reason: '' })
    }
  }

  async function createReview() {
    if (reviewForm.userId === reviewForm.reviewerUserId) {
      setMessage('Choose an independent reviewer.')
      return
    }
    if (await action({ action: 'CREATE_ACCESS_REVIEW', ...reviewForm, dueAt: new Date(`${reviewForm.dueAt}T12:00:00`).toISOString() })) {
      setReviewOpen(false)
      setReviewForm({ userId: '', reviewerUserId: '', dueAt: '' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Governance and operational assurance</h1>
        <p className="text-sm text-slate-600">Legal holds, retention evidence, access certification, audit integrity and failed delivery recovery.</p>
      </div>
      {message && <p role="status" className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border bg-white p-4">
          <p className="text-xs font-bold uppercase">Audit chain</p>
          <p className={`mt-2 font-bold ${data.auditIntegrity.valid ? 'text-emerald-700' : 'text-rose-700'}`}>{data.auditIntegrity.valid ? 'Valid' : 'Integrity issue'}</p>
          <p className="text-xs">{data.auditIntegrity.checked || 0} chained entries</p>
        </div>
        <button disabled={busy} onClick={() => void action({ action: 'RUN_RETENTION' })} className="border bg-white p-4 text-left disabled:opacity-50">
          <span className="font-bold">Run retention policy</span>
          <span className="block text-xs text-slate-500">Legal holds are honored and evidence is hashed.</span>
        </button>
        <button disabled={busy} onClick={() => void action({ action: 'RETRY_DEAD_LETTERS' })} className="border bg-white p-4 text-left disabled:opacity-50">
          <span className="font-bold">Retry dead letters ({data.deadLetters.length})</span>
          <span className="block text-xs text-slate-500">Return failed messages to the delivery queue.</span>
        </button>
      </div>

      <section className="border bg-white p-4">
        <div className="flex justify-between gap-3">
          <h2 className="font-bold">Legal holds</h2>
          <button onClick={() => setHoldOpen(true)} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Place hold</button>
        </div>
        {data.legalHolds.length === 0 && <p className="mt-3 text-sm text-slate-500">No legal holds recorded.</p>}
        {data.legalHolds.map((hold: any) => (
          <div key={hold.id} className="mt-3 flex justify-between gap-3 border-t pt-3 text-sm">
            <span><b>{hold.resourceType}</b> {hold.resourceId}<span className="block text-xs text-slate-500">{hold.reason} · {hold.status}</span></span>
            {hold.status === 'ACTIVE' && <button onClick={() => setReleaseHold(hold)} className="text-xs font-bold text-rose-700">Release</button>}
          </div>
        ))}
      </section>

      <section className="border bg-white p-4">
        <div className="flex justify-between gap-3">
          <h2 className="font-bold">Access certification</h2>
          <button onClick={() => setReviewOpen(true)} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Create review</button>
        </div>
        {data.accessReviews.length === 0 && <p className="mt-3 text-sm text-slate-500">No access reviews recorded.</p>}
        {data.accessReviews.map((review: any) => (
          <div key={review.id} className="mt-3 flex justify-between gap-3 border-t pt-3 text-xs">
            <span>User {review.userId} · reviewer {review.reviewerUserId} · due {new Date(review.dueAt).toLocaleDateString()} · <b>{review.status}</b></span>
            {review.status === 'PENDING' && <button onClick={() => setReviewDecision(review)} className="font-bold text-emerald-700">Record decision</button>}
          </div>
        ))}
      </section>

      <section className="border bg-white p-4">
        <h2 className="font-bold">Retention evidence</h2>
        {data.retentionRuns.length === 0 && <p className="mt-3 text-sm text-slate-500">No retention runs recorded.</p>}
        {data.retentionRuns.map((run: any) => <p key={run.id} className="mt-2 border-t pt-2 text-xs">{new Date(run.startedAt).toLocaleString()} · {run.status} · {run.evidenceHash || 'No evidence hash'}</p>)}
      </section>
      <section className="border bg-white p-4">
        <h2 className="font-bold">Unresolved operational events</h2>
        {data.operationalEvents.length === 0 && <p className="mt-3 text-sm text-slate-500">No unresolved operational events.</p>}
        {data.operationalEvents.map((event: any) => <p key={event.id} className="mt-2 border-t pt-2 text-xs"><b>{event.severity}</b> {event.eventType} · {event.resourceType} {event.resourceId}</p>)}
      </section>

      <Dialog open={holdOpen} onClose={() => setHoldOpen(false)} title="Place legal hold">
        <form onSubmit={(event) => { event.preventDefault(); void placeHold() }} className="space-y-4">
          <label className="block text-xs font-semibold">Resource type
            <select value={holdForm.resourceType} onChange={(event) => setHoldForm({ ...holdForm, resourceType: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm">
              <option>APPLICATION</option><option>CANDIDATE</option><option>USER</option><option>NOTIFICATION</option><option>REFEREE</option><option>REFERENCE_REQUEST</option><option>OUTBOX_MESSAGE</option><option>IDEMPOTENCY_RECORD</option><option>RATE_LIMIT_BUCKET</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">Resource ID
            <input required value={holdForm.resourceId} onChange={(event) => setHoldForm({ ...holdForm, resourceId: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" />
          </label>
          <label className="block text-xs font-semibold">Reason
            <textarea required minLength={10} rows={4} value={holdForm.reason} onChange={(event) => setHoldForm({ ...holdForm, reason: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" />
          </label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setHoldOpen(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Place hold</button></div>
        </form>
      </Dialog>

      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} title="Create access review">
        <form onSubmit={(event) => { event.preventDefault(); void createReview() }} className="space-y-4">
          <label className="block text-xs font-semibold">Account being reviewed
            <select required value={reviewForm.userId} onChange={(event) => setReviewForm({ ...reviewForm, userId: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm"><option value="">Select account</option>{data.users.map((user: any) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold">Independent reviewer
            <select required value={reviewForm.reviewerUserId} onChange={(event) => setReviewForm({ ...reviewForm, reviewerUserId: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm"><option value="">Select reviewer</option>{data.users.map((user: any) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold">Due date
            <input type="date" required value={reviewForm.dueAt} onChange={(event) => setReviewForm({ ...reviewForm, dueAt: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" />
          </label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setReviewOpen(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Create review</button></div>
        </form>
      </Dialog>

      <ReasonDialog open={Boolean(releaseHold)} onClose={() => setReleaseHold(null)} onConfirm={async (reason) => { if (await action({ action: 'RELEASE_HOLD', id: releaseHold.id, reason })) setReleaseHold(null) }} title="Release legal hold" description="Explain why the hold no longer applies." confirmLabel="Release hold" reasonLabel="Release reason" reasonRequired tone="danger" busy={busy} />
      <ReasonDialog open={Boolean(reviewDecision)} onClose={() => setReviewDecision(null)} onConfirm={async (decisionComment) => { if (await action({ action: 'DECIDE_ACCESS_REVIEW', id: reviewDecision.id, status: 'APPROVED', decisionComment })) setReviewDecision(null) }} title="Certify account access" description="Record the evidence reviewed before certifying access." confirmLabel="Certify access" reasonLabel="Evidence and decision" reasonRequired busy={busy} />
    </div>
  )
}
