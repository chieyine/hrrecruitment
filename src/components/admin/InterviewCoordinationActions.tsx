'use client'

import { useState } from 'react'
import { Send, RotateCcw, ShieldCheck, Loader2, CalendarClock } from 'lucide-react'

/**
 * Coordinator actions on a scheduled interview whose endpoints existed but had
 * no UI: sending the candidate invitation, rescheduling, reopening a panel
 * member's score, and approving a declared conflict of interest.
 *
 * A declared conflict previously had no resolution path at all, so an interview
 * could stall on a conflict nobody could clear.
 */

interface PanelMember {
  id: string
  email: string
  conflictStatus: string
  conflictComment?: string | null
  hasSubmitted: boolean
}

function localDateTimeValue(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function InterviewCoordinationActions({
  interviewId,
  status,
  applicationStatus,
  scheduledStart,
  scheduledEnd,
  canResolveExceptions,
  canReopenScores,
  panelApproved,
  canApprovePanel,
  panelMembers,
}: {
  interviewId: string
  status: string
  applicationStatus: string
  scheduledStart: string
  scheduledEnd: string
  canResolveExceptions: boolean
  canReopenScores: boolean
  panelApproved: boolean
  canApprovePanel: boolean
  panelMembers: PanelMember[]
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [panelApprovalComment, setPanelApprovalComment] = useState('')
  const [newStart, setNewStart] = useState(localDateTimeValue(scheduledStart))
  const [newEnd, setNewEnd] = useState(localDateTimeValue(scheduledEnd))
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const send = async (url: string, method: 'POST' | 'PATCH', body: unknown, label: string, success: string) => {
    setBusy(label)
    setMessage('')
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || 'That did not work')
        return false
      }
      setMessage(success)
      // A reload is the honest option here: these actions change application
      // status and panel state that this server-rendered page derives.
      setTimeout(() => window.location.reload(), 700)
      return true
    } finally {
      setBusy(null)
    }
  }

  const spinner = (label: string) => busy === label && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
  const canInvite = panelApproved &&
    status !== 'CANCELLED' && ['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(applicationStatus)
  const declaredConflicts = panelMembers.filter(
    (member) => member.conflictStatus !== 'NONE' && member.conflictStatus !== 'RESOLVED_EXCEPTION'
  )
  const submitted = panelMembers.filter((member) => member.hasSubmitted)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-brand-400 hover:text-brand-700"
      >
        Coordinator actions
        {declaredConflicts.length > 0 && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
            {declaredConflicts.length} conflict{declaredConflicts.length === 1 ? '' : 's'}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-slate-300 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-950">Coordinator actions</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-slate-600">
          Hide
        </button>
      </div>

      {/* ---- invite the candidate ---- */}
      {!panelApproved && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Panel approval
          </h5>
          <p className="mt-2 text-xs text-amber-900">The HR Manager must approve the chair, panel members and safeguarding question before the invitation is sent. Panels created by the HR Manager are approved automatically.</p>
          {canApprovePanel && (
            <>
              <textarea rows={2} value={panelApprovalComment} onChange={(event) => setPanelApprovalComment(event.target.value)} placeholder="Why this panel is suitable" className="mt-2 w-full rounded-lg border border-amber-300 p-2 text-sm" />
              <button type="button" disabled={busy !== null || panelApprovalComment.trim().length < 5} onClick={() => send(`/api/recruitment/interviews/${interviewId}/approve-panel`, 'POST', { comment: panelApprovalComment }, 'panel-approval', 'Panel approved')} className="mt-2 btn-secondary">{spinner('panel-approval')}Approve panel</button>
            </>
          )}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Send className="h-3.5 w-3.5 text-brand-700" aria-hidden /> Send candidate invitation
        </h5>
        {canInvite ? (
          <>
            <textarea
              rows={2}
              value={inviteMessage}
              onChange={(event) => setInviteMessage(event.target.value)}
              maxLength={2000}
              placeholder="Optional note. Left blank, the candidate gets the interview title, date and time."
              className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              aria-label="Invitation message"
            />
            <button
              type="button"
              onClick={() =>
                send(
                  `/api/recruitment/interviews/${interviewId}/invite`,
                  'POST',
                  { message: inviteMessage || undefined },
                  'invite',
                  'Invitation sent'
                )
              }
              disabled={busy !== null}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {spinner('invite')}Send invitation
            </button>
          </>
        ) : (
          <p className="mt-2 text-xs italic text-slate-500">
            {!panelApproved ? 'Approve the panel before sending the invitation.' : `Not available: the application is at ${applicationStatus.replaceAll('_', ' ').toLowerCase()}.`}
          </p>
        )}
      </div>

      {/* ---- reschedule ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <CalendarClock className="h-3.5 w-3.5 text-emerald-700" aria-hidden /> Reschedule
        </h5>
        <p className="mt-1 text-xs text-slate-500">Times below use your device’s timezone.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            New start
            <input
              type="datetime-local"
              value={newStart}
              onChange={(event) => setNewStart(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            New end
            <input
              type="datetime-local"
              value={newEnd}
              onChange={(event) => setNewEnd(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() =>
            send(
              `/api/recruitment/interviews/${interviewId}`,
              'PATCH',
              { scheduledStart: new Date(newStart).toISOString(), scheduledEnd: new Date(newEnd).toISOString() },
              'reschedule',
              'Interview rescheduled'
            )
          }
          disabled={busy !== null || !newStart || !newEnd || new Date(newEnd) <= new Date(newStart)}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {spinner('reschedule')}Save new times
        </button>
      </div>

      {/* ---- conflicts ---- */}
      {declaredConflicts.length > 0 && canResolveExceptions && (
        <div className="rounded-xl border border-rose-200 bg-white p-3">
          <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-700" aria-hidden /> Declared conflicts of interest
          </h5>
          <p className="mt-1 text-xs text-slate-600">
            An HR manager other than the declaring member must record how each conflict was resolved.
          </p>
          <ul className="mt-2 space-y-3">
            {declaredConflicts.map((member) => (
              <li key={member.id} className="rounded-lg bg-rose-50/60 p-2">
                <p className="text-xs font-bold text-slate-900">
                  {member.email} · {member.conflictStatus.replaceAll('_', ' ')}
                </p>
                {member.conflictComment && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{member.conflictComment}</p>
                )}
                <input
                  value={reasons[`conflict-${member.id}`] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({ ...current, [`conflict-${member.id}`]: event.target.value }))
                  }
                  placeholder="How was this resolved? (at least 10 characters)"
                  className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  aria-label={`Resolution for ${member.email}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    send(
                      `/api/recruitment/interviews/${interviewId}/panel/${member.id}/resolve-conflict`,
                      'POST',
                      { resolution: reasons[`conflict-${member.id}`] },
                      `conflict-${member.id}`,
                      'Conflict exception recorded'
                    )
                  }
                  disabled={busy !== null || (reasons[`conflict-${member.id}`] ?? '').trim().length < 10}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {spinner(`conflict-${member.id}`)}Approve exception
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- reopen a panel score ---- */}
      {submitted.length > 0 && canReopenScores && (
        <div className="rounded-xl border border-amber-200 bg-white p-3">
          <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <RotateCcw className="h-3.5 w-3.5 text-amber-700" aria-hidden /> Reopen a submitted panel score
          </h5>
          <ul className="mt-2 space-y-3">
            {submitted.map((member) => (
              <li key={member.id}>
                <p className="text-xs font-bold text-slate-900">{member.email}</p>
                <input
                  value={reasons[`reopen-${member.id}`] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({ ...current, [`reopen-${member.id}`]: event.target.value }))
                  }
                  placeholder="Reason for reopening"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  aria-label={`Reason to reopen ${member.email}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    send(
                      `/api/recruitment/interviews/${interviewId}/panel/${member.id}/reopen`,
                      'POST',
                      { reason: reasons[`reopen-${member.id}`] },
                      `reopen-${member.id}`,
                      'Panel score reopened'
                    )
                  }
                  disabled={busy !== null || (reasons[`reopen-${member.id}`] ?? '').trim().length < 5}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {spinner(`reopen-${member.id}`)}Reopen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-900">
          {message}
        </p>
      )}
    </div>
  )
}
