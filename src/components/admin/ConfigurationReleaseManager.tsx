'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { formatDateTime } from '@/lib/utils'

export default function ConfigurationReleaseManager({ userId }: { userId: string }) {
  const [releases, setReleases] = useState<any[]>([])
  const [view, setView] = useState<'action' | 'history'>('action')
  const [pending, setPending] = useState<{
    release: any
    action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'ROLLBACK'
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/configuration-releases')
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Drafts could not be loaded.')
      setReleases(body.releases || [])
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'Drafts could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => {
    void load()
  }, [load])
  async function act(comment: string) {
    if (!pending) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/configuration-releases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: pending.release.id,
          action: pending.action,
          comment,
          lockVersion: pending.release.lockVersion,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The draft could not be updated.')
      toast('success', `${pending.action.toLowerCase().replace('_', ' ')} completed.`)
      setPending(null)
      await load()
    } catch (cause) {
      toast('error', cause instanceof Error ? cause.message : 'The draft could not be updated.')
    } finally {
      setBusy(false)
    }
  }
  const safeObject = (value: string | null) => {
    try {
      const parsed = value ? JSON.parse(value) : {}
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  const showValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }
  const activeStatuses = ['DRAFT', 'PENDING', 'APPROVED']
  const visible = releases.filter((release) =>
    view === 'action' ? activeStatuses.includes(release.status) : !activeStatuses.includes(release.status)
  )
  return (
    <div className="space-y-5">
      <nav aria-label="Draft sections" className="flex gap-7 border-b border-stone-300">
        <button type="button" onClick={() => setView('action')} className={`border-b-2 pb-3 text-sm font-semibold ${view === 'action' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
          Needs action
        </button>
        <button type="button" onClick={() => setView('history')} className={`border-b-2 pb-3 text-sm font-semibold ${view === 'history' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
          History
        </button>
      </nav>
      {loading ? (
        <div className="section-panel px-6 py-10 text-center text-sm text-stone-600">Loading drafts…</div>
      ) : visible.length === 0 ? (
        <div className="section-panel px-6 py-10 text-center text-sm text-stone-600">
          {view === 'action' ? 'No configuration drafts need action.' : 'No completed configuration changes.'}
        </div>
      ) : (
        visible.map((release) => {
          const proposal = safeObject(release.proposedJson) as Record<string, unknown>
          const previous = safeObject(release.previousJson) as Record<string, unknown>
          const changed = Object.keys(proposal).filter(
            (key) => String(proposal[key] ?? '') !== String(previous[key] ?? '')
          )
          return (
            <section key={release.id} className="section-panel p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {release.changeType.replace('GENERIC_CONFIG_UPDATE:', '').replaceAll('-', ' ')}
                  </p>
                  <h2 className="mt-1 font-bold text-slate-950">{release.reason}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Requested {formatDateTime(release.requestedAt)} · {changed.length} changed field
                    {changed.length === 1 ? '' : 's'}
                    {release.scheduledFor ? ` · scheduled ${formatDateTime(release.scheduledFor)}` : ''}
                  </p>
                </div>
                <span className="status-chip bg-stone-100 text-stone-800">{release.status.replaceAll('_', ' ').toLowerCase()}</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="data-table min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Current</th>
                      <th>Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changed.map((key) => (
                      <tr key={key}>
                        <td>{key.replaceAll('_', ' ')}</td>
                        <td><span className="whitespace-pre-wrap break-words">{showValue(previous[key])}</span></td>
                        <td><span className="whitespace-pre-wrap break-words">{showValue(proposal[key])}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {release.status === 'DRAFT' && release.requestedBy === userId && (
                  <button onClick={() => setPending({ release, action: 'SUBMIT' })} className="btn-primary">
                    Submit for approval
                  </button>
                )}
                {release.status === 'PENDING' && release.requestedBy !== userId && (
                  <>
                    <button onClick={() => setPending({ release, action: 'APPROVE' })} className="btn-primary">
                      Approve
                    </button>
                    <button onClick={() => setPending({ release, action: 'REJECT' })} className="btn-secondary">
                      Reject
                    </button>
                  </>
                )}
                {release.status === 'APPROVED' &&
                  (!release.scheduledFor || new Date(release.scheduledFor) <= new Date()) &&
                  (!release.effectiveFrom || new Date(release.effectiveFrom) <= new Date()) && (
                  <button onClick={() => setPending({ release, action: 'PUBLISH' })} className="btn-primary">
                    Publish now
                  </button>
                )}
                {release.status === 'APPROVED' &&
                  ((release.scheduledFor && new Date(release.scheduledFor) > new Date()) ||
                    (release.effectiveFrom && new Date(release.effectiveFrom) > new Date())) && (
                    <p className="text-sm font-semibold text-stone-600">
                      Publishes automatically {formatDateTime(release.scheduledFor || release.effectiveFrom)}
                    </p>
                  )}
                {release.status === 'APPLIED' && (
                  <button onClick={() => setPending({ release, action: 'ROLLBACK' })} className="btn-secondary">
                    Roll back
                  </button>
                )}
              </div>
            </section>
          )
        })
      )}
      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={act}
        title={`${pending?.action.toLowerCase().replace('_', ' ')} configuration release`}
        description="The decision, reason, actor and before/after values will be retained in the audit record."
        confirmLabel="Confirm"
        reasonLabel="Decision or publication note"
        reasonRequired
        busy={busy}
      />
    </div>
  )
}
