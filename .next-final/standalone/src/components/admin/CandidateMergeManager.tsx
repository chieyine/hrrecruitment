'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

type Candidate = { id: string; name: string; email: string }

export default function CandidateMergeManager({ candidates, userId }: { candidates: Candidate[]; userId: string }) {
  const [primary, setPrimary] = useState('')
  const [duplicate, setDuplicate] = useState('')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [choices, setChoices] = useState<Record<string, 'PRIMARY' | 'DUPLICATE'>>({})
  const [reviews, setReviews] = useState<any[]>([])
  const [pending, setPending] = useState<{ review: any; action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'MERGE' } | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const load = useCallback(async () => { const response = await fetch('/api/recruitment/data-quality/merges'); const body = await response.json(); if (response.ok) setReviews(body.reviews || []) }, [])
  useEffect(() => { void load() }, [load])
  async function inspect() {
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ primaryCandidateId: primary, duplicateCandidateId: duplicate, reason: reason || 'Review possible duplicate candidate records', survivorChoices: choices, previewOnly: true }) })
    const body = await response.json(); setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not compare records.')
    setPreview(body.preview)
    setChoices(Object.fromEntries(body.preview.fields.map((item: any) => [item.field, 'PRIMARY'])))
  }
  async function createReview() {
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ primaryCandidateId: primary, duplicateCandidateId: duplicate, reason, survivorChoices: choices, previewOnly: false }) })
    const body = await response.json(); setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not create merge review.')
    toast('success', 'Controlled merge review created.')
    setPreview(null); setPrimary(''); setDuplicate(''); setReason('')
    await load()
  }
  async function act(actionReason: string) {
    if (!pending) return
    setBusy(true)
    const response = await fetch('/api/recruitment/data-quality/merges', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId: pending.review.id, action: pending.action, reason: actionReason, lockVersion: pending.review.lockVersion }) })
    const body = await response.json(); setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not update merge review.')
    toast('success', `${pending.action.toLowerCase()} completed.`); setPending(null); await load()
  }
  return <section className="section-panel">
    <h2 className="font-bold">Controlled duplicate review and merge</h2><p className="mt-1 text-xs leading-5 text-slate-500">Compare both records, choose each surviving value, obtain independent approval, then merge related history in one transaction.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2"><label><span className="field-label">Record that will survive</span><select value={primary} onChange={(event) => { setPrimary(event.target.value); setPreview(null) }} className="field-control"><option value="">Choose primary record</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label><label><span className="field-label">Possible duplicate</span><select value={duplicate} onChange={(event) => { setDuplicate(event.target.value); setPreview(null) }} className="field-control"><option value="">Choose duplicate record</option>{candidates.filter((item) => item.id !== primary).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label></div>
    <label className="mt-3 block"><span className="field-label">Reason for review</span><textarea minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="field-control"/></label>
    <button disabled={busy || !primary || !duplicate} onClick={() => void inspect()} className="btn-secondary mt-3">{busy ? 'Comparing…' : 'Compare records'}</button>
    {preview && <div className="mt-5 space-y-4"><div className={`border p-3 text-sm ${preview.canMerge ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>{preview.canMerge ? 'No relationship conflicts prevent a controlled merge.' : `${preview.conflicts.applications.length} duplicate vacancy application conflict(s) and ${preview.conflicts.talentPools} duplicate talent-pool membership(s) must be resolved first.`}</div><div className="overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Field</th><th>Primary value</th><th>Duplicate value</th><th>Keep</th></tr></thead><tbody>{preview.fields.map((item: any) => <tr key={item.field}><td>{item.field.replaceAll(/([A-Z])/g, ' $1')}</td><td>{String(item.primary ?? '—')}</td><td>{String(item.duplicate ?? '—')}</td><td><select value={choices[item.field] || 'PRIMARY'} onChange={(event) => setChoices({ ...choices, [item.field]: event.target.value as 'PRIMARY' | 'DUPLICATE' })} className="field-control"><option value="PRIMARY">Primary</option><option value="DUPLICATE">Duplicate</option></select></td></tr>)}</tbody></table></div><button disabled={!preview.canMerge || reason.trim().length < 10 || busy} onClick={() => void createReview()} className="btn-primary">Create merge review</button></div>}
    {reviews.length > 0 && <div className="mt-7 border-t border-slate-200 pt-5"><h3 className="text-sm font-bold">Merge review queue</h3><div className="mt-3 space-y-3">{reviews.map((review) => <div key={review.id} className="border border-slate-200 p-4 text-xs"><div className="flex justify-between gap-3"><div><p className="font-semibold">{review.reason}</p><p className="mt-1 text-slate-500">{review.primaryCandidateId} ← {review.duplicateCandidateId}</p></div><span className="status-chip bg-slate-100">{review.status}</span></div><div className="mt-3 flex gap-2">{review.status === 'DRAFT' && review.requestedBy === userId && <button onClick={() => setPending({ review, action: 'SUBMIT' })} className="btn-primary">Submit</button>}{review.status === 'PENDING' && review.requestedBy !== userId && <><button onClick={() => setPending({ review, action: 'APPROVE' })} className="btn-primary">Approve</button><button onClick={() => setPending({ review, action: 'REJECT' })} className="btn-secondary">Reject</button></>}{review.status === 'APPROVED' && <button onClick={() => setPending({ review, action: 'MERGE' })} className="btn-primary">Complete merge</button>}</div></div>)}</div></div>}
    <ReasonDialog open={pending !== null} onClose={() => setPending(null)} onConfirm={act} title={`${pending?.action.toLowerCase()} candidate merge`} description="The platform retains the original identifiers, approval, survivor choices and audit link between both records." confirmLabel="Confirm" reasonLabel="Decision reason" reasonRequired busy={busy}/>
  </section>
}
