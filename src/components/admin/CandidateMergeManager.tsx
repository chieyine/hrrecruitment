'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

type Candidate = { id: string; name: string; email: string }

async function fetchMergeReviews() {
  const response = await fetch('/api/recruitment/data-quality/merges')
  if (!response.ok) return []
  const body = await response.json()
  return body.reviews || []
}

export default function CandidateMergeManager({ candidates, userId }: { candidates: Candidate[]; userId: string }) {
  const [primary, setPrimary] = useState('')
  const [duplicate, setDuplicate] = useState('')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [choices, setChoices] = useState<Record<string, 'PRIMARY' | 'DUPLICATE'>>({})
  const [reviews, setReviews] = useState<any[]>([])
  const [pending, setPending] = useState<{ review: any; action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'MERGE' } | null>(
    null
  )
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  async function loadReviews() {
    setReviews(await fetchMergeReviews())
  }

  useEffect(() => {
    let active = true
    void fetchMergeReviews().then((items) => {
      if (active) setReviews(items)
    })
    return () => {
      active = false
    }
  }, [])
  async function inspect() {
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primaryCandidateId: primary,
        duplicateCandidateId: duplicate,
        reason: reason || 'Review possible duplicate candidate records',
        survivorChoices: choices,
        previewOnly: true,
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not compare records.')
    setPreview(body.preview)
    setChoices(Object.fromEntries(body.preview.fields.map((item: any) => [item.field, 'PRIMARY'])))
  }
  async function createReview() {
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primaryCandidateId: primary,
        duplicateCandidateId: duplicate,
        reason,
        survivorChoices: choices,
        previewOnly: false,
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not create merge review.')
    toast('success', 'Merge review created.')
    setPreview(null)
    setPrimary('')
    setDuplicate('')
    setReason('')
    await loadReviews()
  }
  async function act(actionReason: string) {
    if (!pending) return
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: pending.review.id,
        action: pending.action,
        reason: actionReason,
        lockVersion: pending.review.lockVersion,
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not update merge review.')
    toast('success', `${pending.action.toLowerCase()} completed.`)
    setPending(null)
    await loadReviews()
  }
  return (
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-950">Compare candidate records</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
            Choose the record to keep, compare every field, and send the proposed merge to another HR reviewer.
          </p>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">Record to keep</span>
            <select
              value={primary}
              onChange={(event) => {
                setPrimary(event.target.value)
                setPreview(null)
              }}
              className="field-control"
            >
              <option value="">Choose a candidate</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Record that may be a duplicate</span>
            <select
              value={duplicate}
              onChange={(event) => {
                setDuplicate(event.target.value)
                setPreview(null)
              }}
              className="field-control"
            >
              <option value="">Choose a candidate</option>
              {candidates
                .filter((item) => item.id !== primary)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.email}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="field-label">Why these records should be compared</span>
          <textarea
            minLength={10}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="field-control"
          />
        </label>
        <button disabled={busy || !primary || !duplicate} onClick={() => void inspect()} className="btn-secondary mt-4">
          {busy ? 'Comparing…' : 'Compare records'}
        </button>

        {preview && (
          <div className="mt-6 space-y-4 border-t border-stone-200 pt-6">
            <div
              className={`border-l-4 px-4 py-3 text-sm ${
                preview.canMerge
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-amber-600 bg-amber-50 text-amber-950'
              }`}
            >
              {preview.canMerge
                ? 'No conflicting applications or talent-pool memberships were found.'
                : `${preview.conflicts.applications.length} application conflict(s) and ${preview.conflicts.talentPools} talent-pool conflict(s) must be resolved first.`}
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Record to keep</th>
                    <th>Possible duplicate</th>
                    <th>Use value from</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.fields.map((item: any) => (
                    <tr key={item.field}>
                      <td>{item.field.replaceAll(/([A-Z])/g, ' $1')}</td>
                      <td>{String(item.primary ?? '—')}</td>
                      <td>{String(item.duplicate ?? '—')}</td>
                      <td>
                        <select
                          value={choices[item.field] || 'PRIMARY'}
                          onChange={(event) =>
                            setChoices({ ...choices, [item.field]: event.target.value as 'PRIMARY' | 'DUPLICATE' })
                          }
                          className="field-control"
                        >
                          <option value="PRIMARY">Record to keep</option>
                          <option value="DUPLICATE">Possible duplicate</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              disabled={!preview.canMerge || reason.trim().length < 10 || busy}
              onClick={() => void createReview()}
              className="btn-primary"
            >
              Send for review
            </button>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="border-t border-stone-200">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <h3 className="text-sm font-semibold text-navy-950">Merge reviews</h3>
            <span className="text-xs text-stone-500">{reviews.length} open</span>
          </div>
          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {reviews.map((review) => (
              <div key={review.id} className="px-5 py-4 text-xs sm:px-6">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-800">{review.reason}</p>
                    <p className="mt-1 text-stone-500">
                      {review.primaryCandidateId} ← {review.duplicateCandidateId}
                    </p>
                  </div>
                  <span className="status-chip border-stone-200 bg-stone-100 text-stone-700">{review.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.status === 'DRAFT' && review.requestedBy === userId && (
                    <button onClick={() => setPending({ review, action: 'SUBMIT' })} className="btn-primary">
                      Send for approval
                    </button>
                  )}
                  {review.status === 'PENDING' && review.requestedBy !== userId && (
                    <>
                      <button onClick={() => setPending({ review, action: 'APPROVE' })} className="btn-primary">
                        Approve
                      </button>
                      <button onClick={() => setPending({ review, action: 'REJECT' })} className="btn-secondary">
                        Reject
                      </button>
                    </>
                  )}
                  {review.status === 'APPROVED' && (
                    <button onClick={() => setPending({ review, action: 'MERGE' })} className="btn-primary">
                      Complete merge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={act}
        title={`${pending?.action.toLowerCase()} candidate records`}
        description="Both original record IDs, the approval and the selected values will remain in the audit history."
        confirmLabel="Confirm"
        reasonLabel="Decision reason"
        reasonRequired
        busy={busy}
      />
    </section>
  )
}
