'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { formatDateTime } from '@/lib/utils'

export default function ConfigurationReleaseManager({ userId }: { userId: string }) {
  const [releases, setReleases] = useState<any[]>([])
  const [pending, setPending] = useState<{
    release: any
    action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'ROLLBACK'
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/configuration-releases')
    const body = await response.json()
    if (response.ok) setReleases(body.releases || [])
    else toast('error', body.error || 'Could not load releases.')
  }, [toast])
  useEffect(() => {
    void load()
  }, [load])
  async function act(comment: string) {
    if (!pending) return
    setBusy(true)
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
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not update release.')
    toast('success', `${pending.action.toLowerCase().replace('_', ' ')} completed.`)
    setPending(null)
    await load()
  }
  return (
    <div className="space-y-4">
      {releases.length === 0 ? (
        <div className="section-panel text-sm text-slate-600">
          No controlled configuration releases have been created.
        </div>
      ) : (
        releases.map((release) => {
          const proposal = JSON.parse(release.proposedJson)
          const previous = release.previousJson ? JSON.parse(release.previousJson) : {}
          const changed = Object.keys(proposal).filter(
            (key) => String(proposal[key] ?? '') !== String(previous[key] ?? '')
          )
          return (
            <section key={release.id} className="section-panel">
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
                <span className="status-chip bg-slate-100 text-slate-800">{release.status}</span>
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
                        <td>{String(previous[key] ?? '—')}</td>
                        <td>{String(proposal[key] ?? '—')}</td>
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
                {release.status === 'APPROVED' && (
                  <button onClick={() => setPending({ release, action: 'PUBLISH' })} className="btn-primary">
                    {release.scheduledFor ? 'Publish when due' : 'Publish now'}
                  </button>
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
