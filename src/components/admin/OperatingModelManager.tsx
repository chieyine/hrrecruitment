'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

type Policy = {
  id: string
  name: string
  workType: string
  targetMinutes: number
}
type Change = {
  id: string
  resourceId: string
  reason: string
  status: string
  lockVersion: number
  requestedBy: string
  requestedAt: string | Date
  proposedJson: string
  previousJson: string | null
  decisionComment?: string | null
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`
  const days = hours / 24
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`
}

function readTarget(value: string | null, fallback = 0) {
  try {
    const parsed = value ? JSON.parse(value) : null
    return Number(parsed?.targetMinutes) || fallback
  } catch {
    return fallback
  }
}

export default function OperatingModelManager({
  policies,
  changes,
  currentUserId,
}: {
  policies: Policy[]
  changes: Change[]
  currentUserId: string
}) {
  const router = useRouter()
  const [view, setView] = useState<'TARGETS' | 'CHANGES'>('TARGETS')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [editing, setEditing] = useState<Policy | null>(null)
  const [targetHours, setTargetHours] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [decision, setDecision] = useState<{ change: Change; decision: 'APPROVE' | 'REJECT' } | null>(null)
  const [busy, setBusy] = useState(false)

  const pending = useMemo(() => changes.filter((change) => change.status === 'PENDING'), [changes])

  function openChange(policy: Policy) {
    setEditing(policy)
    setTargetHours(String(Number((policy.targetMinutes / 60).toFixed(2))))
    setChangeReason('')
  }

  async function requestChange() {
    if (!editing) return
    const hours = Number(targetHours)
    const targetMinutes = Math.round(hours * 60)
    if (!Number.isFinite(hours) || hours < 0.25 || targetMinutes > 525_600) {
      setIsError(true)
      setMessage('Enter a target between 15 minutes and one year.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/operating-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType: 'SLA_POLICY_UPDATE',
          resourceId: editing.id,
          targetMinutes,
          reason: changeReason.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The proposed change could not be submitted.')
      setIsError(false)
      setMessage('Work target submitted for independent review.')
      setEditing(null)
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'The proposed change could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  async function decide(comment: string) {
    if (!decision) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/operating-model', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: decision.change.id,
          decision: decision.decision,
          comment,
          lockVersion: decision.change.lockVersion,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The decision could not be recorded.')
      setIsError(false)
      setMessage(decision.decision === 'APPROVE' ? 'Work target approved and applied.' : 'Proposed target declined.')
      setDecision(null)
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'The decision could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Recruitment operations</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-navy-950">Work targets</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Set how long new recruitment work should remain open before it is due. Changes affect newly created work only.
        </p>
      </header>

      <div className="flex gap-6 border-b border-stone-200" role="tablist" aria-label="Work target views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'TARGETS'}
          onClick={() => setView('TARGETS')}
          className={`border-b-2 pb-3 text-sm font-semibold ${view === 'TARGETS' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}
        >
          Current targets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'CHANGES'}
          onClick={() => setView('CHANGES')}
          className={`border-b-2 pb-3 text-sm font-semibold ${view === 'CHANGES' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}
        >
          Change register <span className="ml-1 text-xs text-stone-500">{pending.length}</span>
        </button>
      </div>

      {message && (
        <div
          role={isError ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm ${isError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {message}
        </div>
      )}

      {view === 'TARGETS' ? (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(220px,1fr)_180px_160px] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 sm:grid">
            <span>Work</span>
            <span>Due after</span>
            <span />
          </div>
          <div className="divide-y divide-stone-200">
            {policies.map((policy) => (
              <div key={policy.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(220px,1fr)_180px_160px] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-navy-950">{policy.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{policy.workType.replaceAll('_', ' ').toLowerCase()}</p>
                </div>
                <p className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Clock3 className="h-4 w-4 text-stone-400" /> {duration(policy.targetMinutes)}
                </p>
                <button type="button" onClick={() => openChange(policy)} className="text-sm font-semibold text-brand-800">
                  Propose change
                </button>
              </div>
            ))}
            {policies.length === 0 && <p className="px-5 py-10 text-sm text-stone-500">No work targets are configured.</p>}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="divide-y divide-stone-200">
            {changes.map((change) => {
              const policy = policies.find((item) => item.id === change.resourceId)
              const previous = readTarget(change.previousJson, policy?.targetMinutes)
              const proposed = readTarget(change.proposedJson)
              return (
                <article key={change.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-navy-950">{policy?.name || 'Retired work target'}</p>
                    <p className="mt-1 text-xs text-stone-500">{new Date(change.requestedAt).toLocaleString('en-GB')}</p>
                    <span className="mt-2 inline-flex rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      {change.status.replaceAll('_', ' ').toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-stone-700">
                      {duration(previous)} <span className="mx-1 text-stone-400">→</span>{' '}
                      <span className="font-semibold text-navy-950">{duration(proposed)}</span>
                    </p>
                    <p className="mt-2 text-sm leading-5 text-stone-600">{change.reason}</p>
                    {change.decisionComment && (
                      <p className="mt-2 text-xs text-stone-500">Decision: {change.decisionComment}</p>
                    )}
                  </div>
                  {change.status === 'PENDING' && change.requestedBy !== currentUserId ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDecision({ change, decision: 'APPROVE' })} className="btn-primary">
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                      <button type="button" onClick={() => setDecision({ change, decision: 'REJECT' })} className="btn-secondary">
                        Decline
                      </button>
                    </div>
                  ) : change.status === 'PENDING' ? (
                    <p className="text-xs text-stone-500">Waiting for another HR manager</p>
                  ) : null}
                </article>
              )
            })}
            {changes.length === 0 && <p className="px-5 py-10 text-sm text-stone-500">No target changes have been proposed.</p>}
          </div>
        </div>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Propose work target">
        <form onSubmit={(event) => { event.preventDefault(); void requestChange() }} className="space-y-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-semibold text-navy-950">{editing?.name}</p>
            <p className="mt-1 text-xs text-stone-500">
              Current target: {editing ? duration(editing.targetMinutes) : ''}
            </p>
          </div>
          <label>
            <span className="field-label">New target in hours *</span>
            <input type="number" min={0.25} max={8760} step={0.25} required value={targetHours} onChange={(event) => setTargetHours(event.target.value)} className="field-control" />
          </label>
          <label>
            <span className="field-label">Reason for change *</span>
            <textarea required minLength={10} maxLength={2000} rows={4} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} className="field-control resize-y" />
          </label>
          <p className="text-xs leading-5 text-stone-500">The HR Manager approves this target before it applies to new work.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={busy || changeReason.trim().length < 10} className="btn-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for review
            </button>
          </div>
        </form>
      </Dialog>

      <ReasonDialog
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        onConfirm={decide}
        title={decision?.decision === 'APPROVE' ? 'Approve work target' : 'Decline work target'}
        description="Record the operational evidence supporting this decision."
        confirmLabel={decision?.decision === 'APPROVE' ? 'Approve and apply' : 'Decline change'}
        reasonLabel="Decision evidence"
        reasonRequired
        tone={decision?.decision === 'REJECT' ? 'danger' : 'default'}
        busy={busy}
      />
    </section>
  )
}
