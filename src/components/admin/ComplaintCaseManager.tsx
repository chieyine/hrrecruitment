'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ReasonDialog } from '@/components/ui/Dialog'
import { allowedComplaintTransitions } from '@/lib/complaint-workflow'

type PendingAction =
  { kind: 'status'; item: any; status: string } | { kind: 'comment'; item: any; internalOnly: boolean }

export default function ComplaintCaseManager({
  initialCases,
  users,
  canClose,
  currentUserId,
  view,
  search,
}: {
  initialCases: any[]
  users: { id: string; email: string }[]
  canClose: boolean
  currentUserId: string
  view: 'open' | 'closed'
  search: string
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
        ? pending.status === 'CLOSED'
          ? { status: pending.status, comment: details, internalOnly: true }
          : { status: pending.status, resolution: details }
        : { comment: details, internalOnly: pending.internalOnly }
    if (await update(pending.item, changes)) setPending(null)
  }

  function changeStatus(item: any, status: string) {
    if (['RESOLVED', 'CLOSED'].includes(status)) setPending({ kind: 'status', item, status })
    else void update(item, { status })
  }

  return (
    <div className="page-shell space-y-6">
      <header className="border-b border-stone-300 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Complaints and appeals</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Triage new cases, keep investigation notes and send the outcome to the reporter.
        </p>
      </header>
      <form className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row">
        <input type="hidden" name="view" value={view} />
        <input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Case reference, subject or reporter email"
          className="field-control min-w-0 flex-1"
        />
        <button className="btn-primary">Search</button>
        {search && (
          <Link href={`/recruitment/complaints?view=${view}`} className="btn-secondary">
            Clear
          </Link>
        )}
      </form>
      <nav className="flex gap-6 border-b border-stone-300" aria-label="Complaint case views">
        {[
          ['open', 'Open cases'],
          ['closed', 'Closed cases'],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/recruitment/complaints?view=${value}`}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
              view === value ? 'border-brand-700 text-brand-900' : 'border-transparent text-stone-500'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {message && (
        <p role="status" className="border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          {message}
        </p>
      )}
      <div className="space-y-4">
        {cases.length === 0 && (
          <p className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
            {search ? 'No cases match this search.' : view === 'closed' ? 'No closed cases.' : 'No open cases.'}
          </p>
        )}
        {cases.map((item) => (
          <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold text-brand-700">{item.referenceNumber}</p>
                <h2 className="font-bold">{item.subject}</h2>
                <p className="text-xs text-slate-500">
                  {item.category} · {new Date(item.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Reporter: {item.reporterEmail || 'Anonymous'}
                  {item.dueAt ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}` : ''}
                </p>
                {item.application && (
                  <Link
                    href={`/recruitment/applications/${item.application.id}`}
                    className="mt-2 inline-flex text-xs font-semibold text-brand-800 hover:underline"
                  >
                    {item.application.candidate.legalFirstName} {item.application.candidate.lastName} ·{' '}
                    {item.application.vacancy.referenceNumber} · {item.application.vacancy.title}
                  </Link>
                )}
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
                      {comment.internalOnly
                        ? users.find((user) => user.id === comment.authorUserId)?.email || 'Internal note'
                        : users.some((user) => user.id === comment.authorUserId)
                          ? 'FRAD update shared with reporter'
                          : comment.authorUserId === currentUserId
                            ? 'Your message'
                            : 'Reporter'}
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
                  disabled={allowedComplaintTransitions(item.status, canClose).length === 0}
                  onChange={(event) => changeStatus(item, event.target.value)}
                  className="mt-1 w-full rounded border p-2 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value={item.status}>{item.status}</option>
                  {allowedComplaintTransitions(item.status, canClose).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
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
              {item.status !== 'CLOSED' && (
                <button
                  onClick={() => setPending({ kind: 'comment', item, internalOnly: true })}
                  className="rounded border px-3 py-2 text-xs font-bold"
                >
                  Add internal note
                </button>
              )}
              {item.status !== 'CLOSED' && (
                <button
                  onClick={() => setPending({ kind: 'comment', item, internalOnly: false })}
                  className="rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white"
                >
                  Send update
                </button>
              )}
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
            ? pending.status === 'CLOSED'
              ? 'Close complaint case'
              : 'Resolve complaint case'
            : pending?.internalOnly
              ? 'Add internal case note'
              : 'Send update to reporter'
        }
        description={
          pending?.kind === 'status'
            ? pending.status === 'CLOSED'
              ? 'Add a final closure note. The recorded resolution will not be changed.'
              : 'State the resolution and the action taken. This is the outcome the reporter will receive.'
            : pending?.internalOnly
              ? 'This note is visible only to authorized staff.'
              : 'This update will be visible to the reporter.'
        }
        confirmLabel={
          pending?.kind === 'status'
            ? pending.status === 'CLOSED'
              ? 'Close case'
              : 'Resolve case'
            : pending?.internalOnly
              ? 'Save note'
              : 'Send update'
        }
        reasonLabel={
          pending?.kind === 'status' ? (pending.status === 'CLOSED' ? 'Closure note' : 'Resolution') : 'Message'
        }
        reasonRequired
        busy={busy}
      />
    </div>
  )
}
