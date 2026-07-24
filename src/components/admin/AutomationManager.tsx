'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function AutomationManager() {
  const [controls, setControls] = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [pending, setPending] = useState<{ control: any; mode: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/automations')
    const body = await response.json()
    if (!response.ok) return toast('error', body.error || 'Could not load automation controls.')
    setControls(body.controls || [])
    setRecent(body.recent || [])
  }, [toast])

  useEffect(() => { void load() }, [load])

  async function change(reason: string) {
    if (!pending) return
    setBusy(true)
    const response = await fetch('/api/admin/automations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pending.control.code, mode: pending.mode, reason }) })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not change automation.')
    toast('success', `${pending.control.name} is now ${pending.mode.toLowerCase()}.`)
    setPending(null)
    await load()
  }

  return <div className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-2">{controls.map((control) => <section key={control.code} className="section-panel">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-950">{control.name}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{control.description}</p></div><span className={`status-chip ${control.mode === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : control.mode === 'PREVIEW' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{control.mode}</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{['ACTIVE', 'PREVIEW', 'PAUSED'].filter((mode) => mode !== control.mode).map((mode) => <button key={mode} onClick={() => setPending({ control, mode })} className="btn-secondary">{mode === 'ACTIVE' ? 'Activate' : mode === 'PREVIEW' ? 'Preview only' : 'Pause'}</button>)}</div>
      <p className="mt-3 text-xs text-slate-500">{control.updatedAt ? `Last changed ${new Date(control.updatedAt).toLocaleString()}` : 'Using the safe active default.'}</p>
    </section>)}</div>
    <section className="section-panel"><h2 className="text-lg font-bold">Recent automated actions</h2><p className="mt-1 text-sm text-slate-600">Every preview, completed action, skip, override and failure is retained.</p><div className="mt-4 overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Time</th><th>Automation</th><th>Action</th><th>Target</th><th>Status</th></tr></thead><tbody>{recent.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.automationCode.replaceAll('_', ' ')}</td><td>{item.action.replaceAll('_', ' ')}</td><td>{item.targetType} · {item.targetId}</td><td>{item.status}</td></tr>)}</tbody></table></div></section>
    <ReasonDialog open={pending !== null} onClose={() => setPending(null)} onConfirm={change} title={`${pending?.mode === 'PAUSED' ? 'Pause' : pending?.mode === 'PREVIEW' ? 'Preview' : 'Activate'} ${pending?.control.name || 'automation'}?`} description={pending?.mode === 'PREVIEW' ? 'The scheduler will identify affected records and record previews without changing or messaging them.' : pending?.mode === 'PAUSED' ? 'The scheduler will retain skipped-action evidence but will not perform this automation.' : 'The scheduler will perform eligible actions and record each result.'} confirmLabel="Confirm control change" reasonLabel="Reason for change" reasonRequired busy={busy} />
  </div>
}
