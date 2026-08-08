'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReasonDialog } from '@/components/ui/Dialog'

type Capabilities = {
  edit: boolean
  submit: boolean
  reviewApproval: boolean
  publish: boolean
  pause: boolean
  resume: boolean
  close: boolean
  cancel: boolean
}

export default function VacancyLifecycleActions({
  vacancyId,
  capabilities,
}: {
  vacancyId: string
  capabilities: Capabilities
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [reasonAction, setReasonAction] = useState<'PAUSE' | 'CANCEL' | null>(null)

  const act = async (action: string, reason?: string) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/vacancies/${vacancyId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The vacancy could not be updated.')
      setReasonAction(null)
      if (action === 'SUBMIT_APPROVAL' && body.automaticallyApproved)
        setMessage('Vacancy approved. It is ready for the final publication checks.')
      router.refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The vacancy could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  const hasAction = Object.entries(capabilities).some(([key, value]) => key !== 'edit' && value)
  if (!hasAction) return null

  return (
    <section className="section-panel">
      <h2 className="text-base font-semibold text-navy-900">Next action</h2>
      <div className="mt-4 space-y-2">
        {capabilities.submit && (
          <button onClick={() => act('SUBMIT_APPROVAL')} disabled={busy} className="btn-primary w-full">
            Submit for approval
          </button>
        )}
        {capabilities.reviewApproval && (
          <Link href="/recruitment/approvals" className="btn-primary w-full">
            Review assigned approval
          </Link>
        )}
        {capabilities.publish && (
          <button onClick={() => act('PUBLISH')} disabled={busy} className="btn-primary w-full">
            Publish vacancy
          </button>
        )}
        {capabilities.pause && (
          <button onClick={() => setReasonAction('PAUSE')} disabled={busy} className="btn-secondary w-full">
            Pause applications
          </button>
        )}
        {capabilities.resume && (
          <button onClick={() => act('RESUME')} disabled={busy} className="btn-secondary w-full">
            Resume applications
          </button>
        )}
        {capabilities.close && (
          <button onClick={() => act('CLOSE')} disabled={busy} className="btn-secondary w-full">
            Close applications
          </button>
        )}
        {capabilities.cancel && (
          <button
            onClick={() => setReasonAction('CANCEL')}
            disabled={busy}
            className="w-full rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"
          >
            Cancel vacancy
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs text-slate-700">
          {message}
        </p>
      )}
      <ReasonDialog
        open={reasonAction !== null}
        onClose={() => setReasonAction(null)}
        onConfirm={(reason) => (reasonAction ? act(reasonAction, reason) : undefined)}
        title={reasonAction === 'PAUSE' ? 'Pause applications' : 'Cancel vacancy'}
        description={
          reasonAction === 'PAUSE'
            ? 'Record why applications are being paused.'
            : 'Cancellation is final. Record the reason for the recruitment file.'
        }
        confirmLabel={reasonAction === 'PAUSE' ? 'Pause applications' : 'Cancel vacancy'}
        reasonLabel="Reason"
        reasonRequired
        tone={reasonAction === 'CANCEL' ? 'danger' : 'default'}
        busy={busy}
      />
    </section>
  )
}
