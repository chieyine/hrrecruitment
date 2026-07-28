'use client'

import { useState } from 'react'
import { ReasonDialog } from '@/components/ui/Dialog'

type PendingAction =
  { kind: 'status'; item: any; status: string } | { kind: 'comment'; item: any; internalOnly: boolean }

export default function ComplaintCaseManager({
  initialCases,
  users,
}: {
  initialCases: any[]
  users: { id: string; email: string }[]
}) {
  const [cases, setCases] = useState(initialCases)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)

  const update = async (item: any, changes: Record<string, unknown>) => {
    setBusy(true)
    const response = await fetch('/api/recruitment/complaints', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(item.lockVersion) },
      body: JSON.stringify({ id: item.id, lockVersion: item.lockVersion, ...changes }),
    })
    const body = await response.json()
    setMessage(response.ok ? 'Case updated.' : body.error || 'Update failed')
    setBusy(false)
    if (response.ok) setCases((current) => current.map((entry) => (entry.id === item.id ? body.case : entry)))
    return response.ok
  }

  async function submitDetails(details: string) {
    if (!pending) return
    const changes =
      pending.kind === 'status'
        ? { status: pending.status, resolution: details }
        : { comment: details, internalOnly: pending.internalOnly }
    if (await update(pending.item, changes)) setPending(null)
  }

  function changeStatus(item: any, status: string) {
    if (['RESOLVED', 'CLOSED'].includes(status)) setPending({ kind: 'status', item, status })
    else void update(item, { status })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-extrabold">Complaints and case management</h1>
        <p className="text-sm text-slate-600">Restricted triage, investigation, response and resolution workspace.</p>
      </div>
      {message && (
        <p role="status" className="border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          {message}
        </p>
      )}
      <div className="space-y-4">
        {cases.length === 0 && <p className="border bg-white p-8 text-center text-slate-500">No cases.</p>}
        {cases.map((item) => (
          <article key={item.id} className="border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold text-brand-700">{item.referenceNumber}</p>
                <h2 className="font-bold">{item.subject}</h2>
                <p className="text-xs text-slate-500">
                  {item.category} · {new Date(item.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Reporter: {item.reporterEmail || 'Anonymous'}
                  {item.applicationId ? ` · Application ${item.applicationId}` : ''}
                  {item.dueAt ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <span className="h-fit bg-amber-50 px-3 py-1 text-xs font-bold">
                {item.priority} / {item.status}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
            {item.attachments?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.attachments.map((attachment: any) => (
                  <a
                    key={attachment.id}
                    href={`/api/assets/download/${attachment.fileAssetId}`}
                    className="rounded border px-3 py-1.5 text-xs font-bold text-brand-700"
                  >
                    Download attachment
                  </a>
                ))}
              </div>
            )}
            {item.comments?.length > 0 && (
              <div className="mt-4 space-y-2 border-l-2 border-slate-200 pl-3">
                {item.comments.map((comment: any) => (
                  <div key={comment.id} className="text-xs">
                    <p className="whitespace-pre-wrap text-slate-700">{comment.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleString()} ·{' '}
                      {comment.internalOnly ? 'Internal note' : 'Shared with reporter'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">
                Status
                <select
                  value={item.status}
                  onChange={(event) => changeStatus(item, event.target.value)}
                  className="mt-1 w-full rounded border p-2 text-xs"
                >
                  <option>RECEIVED</option>
                  <option>TRIAGED</option>
                  <option>INVESTIGATING</option>
                  <option>AWAITING_INFORMATION</option>
                  <option>RESOLVED</option>
                  <option>CLOSED</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Priority
                <select
                  value={item.priority}
                  onChange={(event) => void update(item, { priority: event.target.value })}
                  className="mt-1 w-full rounded border p-2 text-xs"
                >
                  <option>LOW</option>
                  <option>NORMAL</option>
                  <option>HIGH</option>
                  <option>CRITICAL</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Assigned to
                <select
                  value={item.assignedToUserId || ''}
                  onChange={(event) => void update(item, { assignedToUserId: event.target.value || null })}
                  className="mt-1 w-full rounded border p-2 text-xs"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setPending({ kind: 'comment', item, internalOnly: true })}
                className="rounded border px-3 py-2 text-xs font-bold"
              >
                Add internal note
              </button>
              <button
                onClick={() => setPending({ kind: 'comment', item, internalOnly: false })}
                className="rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white"
              >
                Send update
              </button>
            </div>
          </article>
        ))}
      </div>
      <ReasonDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={submitDetails}
        title={
          pending?.kind === 'status'
            ? 'Resolve complaint case'
            : pending?.internalOnly
              ? 'Add internal case note'
              : 'Send update to reporter'
        }
        description={
          pending?.kind === 'status'
            ? 'State the resolution and the action taken.'
            : pending?.internalOnly
              ? 'This note is visible only to authorized staff.'
              : 'This update will be visible to the reporter.'
        }
        confirmLabel={pending?.kind === 'status' ? 'Resolve case' : pending?.internalOnly ? 'Save note' : 'Send update'}
        reasonLabel={pending?.kind === 'status' ? 'Resolution' : 'Message'}
        reasonRequired
        busy={busy}
      />
    </div>
  )
}
