'use client'

import { useState } from 'react'
import { ShieldPlus } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toaster'

type Check = { id: string; applicationId: string; checkType: string; status: string; restricted: boolean }
type CandidateOption = { id: string; label: string }
type PendingAction = { kind: 'REQUEST' | 'RESULT' | 'WAIVE'; check: Check }

const LAWFUL_BASIS_TYPES = new Set(['CRIMINAL_RECORD', 'SAFEGUARDING', 'SANCTIONS_SCREENING'])
const RESULT_STATUSES = ['CLEARED', 'CONCERNS_RAISED', 'FAILED', 'IN_PROGRESS', 'RECEIVED']

export default function BackgroundCheckActions({
  checks,
  candidates,
  canWaive,
}: {
  checks: Check[]
  candidates: CandidateOption[]
  canWaive: boolean
}) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [providerName, setProviderName] = useState('')
  const [lawfulBasis, setLawfulBasis] = useState('')
  const [resultStatus, setResultStatus] = useState('CLEARED')
  const [findingSummary, setFindingSummary] = useState('')
  const [waiverReason, setWaiverReason] = useState('')
  const { toast } = useToast()

  const post = async (body: unknown, success: string) => {
    setBusy(true)
    try {
      const response = await fetch('/api/recruitment/background-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The check action failed')
      toast('success', success)
      setPending(null)
      window.location.reload()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'The check action failed')
    } finally {
      setBusy(false)
    }
  }

  const openAction = (kind: PendingAction['kind'], check: Check) => {
    setProviderName('')
    setLawfulBasis('')
    setResultStatus('CLEARED')
    setFindingSummary('')
    setWaiverReason('')
    setPending({ kind, check })
  }

  const submitPending = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!pending) return
    if (pending.kind === 'REQUEST') {
      await post(
        {
          action: 'REQUEST',
          applicationId: pending.check.applicationId,
          checkType: pending.check.checkType,
          providerName: providerName || undefined,
          lawfulBasis: lawfulBasis || undefined,
        },
        'Check requested.'
      )
      return
    }
    if (pending.kind === 'WAIVE') {
      await post({ action: 'WAIVE', checkId: pending.check.id, reason: waiverReason }, 'Check waived.')
      return
    }
    const outcome =
      resultStatus === 'CLEARED'
        ? 'CLEAR'
        : resultStatus === 'FAILED'
          ? 'ADVERSE'
          : resultStatus === 'CONCERNS_RAISED'
            ? 'INCONCLUSIVE'
            : undefined
    await post(
      {
        action: 'RECORD_RESULT',
        checkId: pending.check.id,
        status: resultStatus,
        outcome,
        findingSummary: findingSummary || undefined,
      },
      'Check result recorded.'
    )
  }

  const findingRequired = ['CONCERNS_RAISED', 'FAILED'].includes(resultStatus)
  const lawfulBasisRequired = pending?.kind === 'REQUEST' && LAWFUL_BASIS_TYPES.has(pending.check.checkType)

  return (
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Background checks</h2>
          <p className="mt-1 text-sm text-stone-600">
            Request checks, record results and review any approved waivers.
          </p>
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 px-5 pb-4 sm:px-6">
          <label className="min-w-64 text-xs font-semibold text-stone-600">
            Candidate
            <select
              className="field-control mt-1"
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || !candidateId}
            onClick={() =>
              void post(
                { action: 'SEED_REQUIRED', applicationId: candidateId },
                'Required checks added.'
              )
            }
          >
            <ShieldPlus className="h-4 w-4" /> Add required checks
          </button>
        </div>
      )}

      {checks.length > 0 && (
        <div className="divide-y divide-stone-100 border-t border-stone-200">
          {checks.map((check) => (
            <div
              key={check.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6"
            >
              <span>
                <strong>{check.checkType.replaceAll('_', ' ').toLowerCase()}</strong>
                <span className="ml-2 text-xs text-stone-500">
                  {check.status.replaceAll('_', ' ').toLowerCase()}
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {check.status === 'NOT_REQUESTED' && (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => openAction('REQUEST', check)}>
                    Request
                  </button>
                )}
                {!['NOT_REQUESTED', 'CLEARED', 'WAIVED', 'NOT_APPLICABLE'].includes(check.status) && (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => openAction('RESULT', check)}>
                    Record result
                  </button>
                )}
                {canWaive && !['CLEARED', 'WAIVED', 'NOT_APPLICABLE'].includes(check.status) && (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => openAction('WAIVE', check)}>
                    Waive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'REQUEST'
            ? 'Request background check'
            : pending?.kind === 'RESULT'
              ? 'Record check result'
              : 'Approve waiver'
        }
        tone={pending?.kind === 'WAIVE' ? 'danger' : 'default'}
      >
        <form className="space-y-4" onSubmit={submitPending}>
          {pending?.kind === 'REQUEST' && (
            <>
              <label className="block">
                <span className="field-label">Provider or internal team</span>
                <input className="field-control" value={providerName} onChange={(event) => setProviderName(event.target.value)} />
              </label>
              {lawfulBasisRequired && (
                <label className="block">
                  <span className="field-label">Lawful basis</span>
                  <textarea required rows={3} className="field-control" value={lawfulBasis} onChange={(event) => setLawfulBasis(event.target.value)} />
                  <span className="field-help">Explain why this check is necessary for the role.</span>
                </label>
              )}
            </>
          )}
          {pending?.kind === 'RESULT' && (
            <>
              <label className="block">
                <span className="field-label">Result</span>
                <select className="field-control" value={resultStatus} onChange={(event) => setResultStatus(event.target.value)}>
                  {RESULT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ').toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Finding summary{findingRequired ? ' *' : ''}</span>
                <textarea required={findingRequired} rows={3} className="field-control" value={findingSummary} onChange={(event) => setFindingSummary(event.target.value)} />
              </label>
            </>
          )}
          {pending?.kind === 'WAIVE' && (
            <label className="block">
              <span className="field-label">Reason for waiver</span>
              <textarea required minLength={15} rows={3} className="field-control" value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} />
              <span className="field-help">Give a clear reason of at least 15 characters.</span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPending(null)}>Cancel</button>
            <button type="submit" className={pending?.kind === 'WAIVE' ? 'btn-danger' : 'btn-primary'} disabled={busy}>
              {busy ? 'Saving…' : pending?.kind === 'REQUEST' ? 'Send request' : pending?.kind === 'RESULT' ? 'Save result' : 'Approve waiver'}
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
