'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Eye, Pause, Play, Search } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { formatDateTime } from '@/lib/utils'

type Control = {
  code: string
  name: string
  description: string
  mode: 'ACTIVE' | 'PREVIEW' | 'PAUSED'
  updatedAt: string | null
}

type ActionLog = {
  id: string
  automationCode: string
  action: string
  targetType: string
  targetId: string
  status: string
  createdAt: string
}

function modeLabel(mode: string) {
  return mode === 'ACTIVE' ? 'Running' : mode === 'PREVIEW' ? 'Preview only' : 'Paused'
}

function modeTone(mode: string) {
  return mode === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-800'
    : mode === 'PREVIEW'
      ? 'bg-sky-50 text-sky-800'
      : 'bg-amber-50 text-amber-900'
}

function statusTone(status: string) {
  if (status === 'FAILED') return 'text-rose-800'
  if (status === 'COMPLETED') return 'text-emerald-800'
  if (status === 'PREVIEWED') return 'text-sky-800'
  return 'text-stone-700'
}

export default function AutomationManager({ canActivate }: { canActivate: boolean }) {
  const [controls, setControls] = useState<Control[]>([])
  const [recent, setRecent] = useState<ActionLog[]>([])
  const [pending, setPending] = useState<{ control: Control; mode: Control['mode'] } | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/automations')
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Scheduled work could not be loaded.')
      setControls(body.controls || [])
      setRecent(body.recent || [])
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Scheduled work could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function change(reason: string) {
    if (!pending) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pending.control.code, mode: pending.mode, reason }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The schedule could not be changed.')
      toast('success', `${pending.control.name}: ${modeLabel(pending.mode).toLowerCase()}.`)
      setPending(null)
      await load()
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'The schedule could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  const needle = search.trim().toLowerCase()
  const visibleControls = controls.filter((control) =>
    `${control.name} ${control.description} ${control.mode}`.toLowerCase().includes(needle)
  )
  const failures = recent.filter((item) => item.status === 'FAILED').length

  return (
    <div className="space-y-6">
      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Schedules</h2>
            <p className="mt-1 text-sm text-stone-600">
              Pausing stops changes and messages. Preview records what would happen without performing it.
            </p>
          </div>
          <label className="relative w-full max-w-xs">
            <span className="sr-only">Search schedules</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedules" className="field-control pl-9" />
          </label>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-stone-600 sm:px-6">Loading schedules…</p>
        ) : !visibleControls.length ? (
          <p className="px-5 py-10 text-center text-sm text-stone-600 sm:px-6">No schedules match this search.</p>
        ) : (
          <div className="divide-y divide-stone-200">
            {visibleControls.map((control) => (
              <div key={control.code} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-950">{control.name}</h3>
                    <span className={`status-chip ${modeTone(control.mode)}`}>{modeLabel(control.mode)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{control.description}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {control.updatedAt ? `Last changed ${formatDateTime(control.updatedAt)}` : 'No manual changes recorded'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {control.mode !== 'PREVIEW' && (
                    <button type="button" onClick={() => setPending({ control, mode: 'PREVIEW' })} className="btn-secondary min-h-10 px-3 py-2 text-xs">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                  )}
                  {control.mode !== 'PAUSED' && (
                    <button type="button" onClick={() => setPending({ control, mode: 'PAUSED' })} className="btn-secondary min-h-10 px-3 py-2 text-xs">
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  )}
                  {control.mode !== 'ACTIVE' && canActivate && (
                    <button type="button" onClick={() => setPending({ control, mode: 'ACTIVE' })} className="btn-primary min-h-10 px-3 py-2 text-xs">
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Recent runs</h2>
            <p className="mt-1 text-sm text-stone-600">Latest completed, previewed, skipped and failed actions.</p>
          </div>
          {failures > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-800">
              <AlertTriangle className="h-4 w-4" /> {failures} failed
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Time</th>
                <th>Schedule</th>
                <th>Action</th>
                <th>Record</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {!recent.length && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-stone-500">No scheduled actions have run yet.</td></tr>
              )}
              {recent.map((item) => (
                <tr key={item.id}>
                  <td><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-stone-400" />{formatDateTime(item.createdAt)}</span></td>
                  <td>{item.automationCode.replaceAll('_', ' ').toLowerCase()}</td>
                  <td>{item.action.replaceAll('_', ' ').toLowerCase()}</td>
                  <td>{item.targetType.replaceAll('_', ' ').toLowerCase()} · <span className="font-mono text-xs">{item.targetId.slice(0, 12)}</span></td>
                  <td className={`font-semibold ${statusTone(item.status)}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {item.status === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {item.status.replaceAll('_', ' ').toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={change}
        title={`${pending?.mode === 'PAUSED' ? 'Pause' : pending?.mode === 'PREVIEW' ? 'Preview' : 'Resume'} ${pending?.control.name || 'schedule'}?`}
        description={
          pending?.mode === 'PREVIEW'
            ? 'Eligible records will be logged, but no records will change and no messages will be sent.'
            : pending?.mode === 'PAUSED'
              ? 'This schedule will stop until an HR manager resumes it.'
              : 'Eligible records may change and messages may be sent from the next run.'
        }
        confirmLabel={pending?.mode === 'ACTIVE' ? 'Resume schedule' : pending?.mode === 'PREVIEW' ? 'Use preview mode' : 'Pause schedule'}
        reasonLabel="Reason for change"
        reasonRequired
        busy={busy}
      />
    </div>
  )
}
