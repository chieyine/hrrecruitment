'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

type Policy = {
  id: string
  name: string
  workType: string
  targetMinutes: number
  warningMinutes: number
  escalationRole: string | null
}
type Change = {
  id: string
  changeType: string
  resourceId: string
  reason: string
  status: string
  lockVersion: number
  requestedAt: string | Date
}

export default function OperatingModelManager({ policies, changes }: { policies: Policy[]; changes: Change[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Policy | null>(null)
  const [targetMinutes, setTargetMinutes] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [decision, setDecision] = useState<{ change: Change; decision: 'APPROVE' | 'REJECT' } | null>(null)
  const [busy, setBusy] = useState(false)

  function openChange(policy: Policy) {
    setEditing(policy)
    setTargetMinutes(String(policy.targetMinutes))
    setChangeReason('')
  }

  async function requestChange() {
    if (!editing) return
    const target = Number(targetMinutes)
    if (!Number.isInteger(target) || target < 1) {
      setMessage('Enter a target of at least one minute.')
      return
    }
    if (changeReason.trim().length < 5) {
      setMessage('Explain the change in at least five characters.')
      return
    }
    setBusy(true)
    const response = await fetch('/api/admin/operating-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeType: 'SLA_POLICY_UPDATE',
        resourceId: editing.id,
        targetMinutes: target,
        warningMinutes: Math.min(editing.warningMinutes, target),
        escalationAfterMinutes: target,
        escalationRole: editing.escalationRole,
        reason: changeReason.trim(),
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Change submitted for independent approval.' : data.error || 'Request failed')
    setBusy(false)
    if (response.ok) {
      setEditing(null)
      router.refresh()
    }
  }

  async function decide(comment: string) {
    if (!decision) return
    setBusy(true)
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
    const data = await response.json()
    setMessage(response.ok ? 'Decision recorded.' : data.error || 'Decision failed')
    setBusy(false)
    if (response.ok) {
      setDecision(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p role="status" className="rounded-lg bg-brand-50 p-3 text-xs font-semibold text-brand-800">
          {message}
        </p>
      )}
      <div className="border bg-white p-5">
        <h2 className="font-bold">Service-level policies</h2>
        <div className="mt-3 divide-y">
          {policies.map((policy) => (
            <div key={policy.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-bold">{policy.name}</p>
                <p className="text-xs text-slate-500">
                  {policy.workType.replaceAll('_', ' ')} · target {policy.targetMinutes} min · warning{' '}
                  {policy.warningMinutes} min
                </p>
              </div>
              <button
                onClick={() => openChange(policy)}
                className="rounded-lg border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700"
              >
                Propose change
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="border bg-white p-5">
        <h2 className="font-bold">Configuration change register</h2>
        <div className="mt-3 divide-y">
          {changes.map((change) => (
            <div key={change.id} className="flex flex-col justify-between gap-3 py-3 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-bold">{change.changeType.replaceAll('_', ' ')}</p>
                <p className="text-xs text-slate-500">
                  {change.reason} · {change.status}
                </p>
              </div>
              {change.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setDecision({ change, decision: 'APPROVE' })}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Approve and apply
                  </button>
                  <button
                    onClick={() => setDecision({ change, decision: 'REJECT' })}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Propose service target change">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void requestChange()
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600">{editing?.name}</p>
          <label className="block text-xs font-semibold text-slate-700">
            New target in minutes
            <input
              type="number"
              min={1}
              required
              value={targetMinutes}
              onChange={(event) => setTargetMinutes(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Reason for change
            <textarea
              required
              minLength={5}
              rows={4}
              value={changeReason}
              onChange={(event) => setChangeReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Submit for approval
            </button>
          </div>
        </form>
      </Dialog>

      <ReasonDialog
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        onConfirm={decide}
        title={decision?.decision === 'APPROVE' ? 'Approve configuration change' : 'Reject configuration change'}
        description="Record the evidence supporting this decision."
        confirmLabel={decision?.decision === 'APPROVE' ? 'Approve and apply' : 'Reject change'}
        reasonLabel="Decision comment"
        reasonRequired
        tone={decision?.decision === 'REJECT' ? 'danger' : 'default'}
        busy={busy}
      />
    </div>
  )
}
