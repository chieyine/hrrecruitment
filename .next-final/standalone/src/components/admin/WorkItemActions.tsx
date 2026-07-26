'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function WorkItemActions({ id, status, lockVersion }: { id: string; status: string; lockVersion: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [blocking, setBlocking] = useState(false)

  async function act(action: 'START' | 'BLOCK' | 'COMPLETE' | 'REOPEN', reason?: string) {
    setBusy(true)
    setError('')
    const response = await fetch(`/api/recruitment/work-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, lockVersion }),
    })
    const data = await response.json()
    setBusy(false)
    if (!response.ok) return setError(data.error || 'Could not update work item')
    setBlocking(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === 'OPEN' && <button disabled={busy} onClick={() => act('START')} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-blue-700">Start</button>}
      {['OPEN', 'IN_PROGRESS'].includes(status) && <button disabled={busy} onClick={() => setBlocking(true)} className="rounded-lg border border-amber-200 px-3 py-1.5 font-semibold text-amber-700">Block</button>}
      {status === 'COMPLETED' && <button disabled={busy} onClick={() => act('REOPEN')} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700">Reopen</button>}
      {error && <span role="alert" className="w-full text-right text-[11px] text-red-700">{error}</span>}
      <ReasonDialog
        open={blocking}
        onClose={() => setBlocking(false)}
        onConfirm={(reason) => act('BLOCK', reason)}
        title="Block work item"
        description="Record what is preventing this work from continuing."
        confirmLabel="Block item"
        reasonLabel="Blocking reason"
        reasonRequired
        busy={busy}
      />
    </div>
  )
}
