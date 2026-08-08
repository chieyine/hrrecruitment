'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toaster'

type SelectedApplication = {
  id: string
  candidate: string
  vacancy: string
  status: string
}

const candidateStatus: Record<string, string> = {
  UNDER_REVIEW: 'UNDER_REVIEW',
  LONGLISTED: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  NOT_SELECTED: 'NOT_SELECTED',
}

export default function BulkApplicationActions({
  applications,
  onClear,
}: {
  applications: SelectedApplication[]
  onClear: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [toStatus, setToStatus] = useState('UNDER_REVIEW')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState('MESSAGE')
  const [options, setOptions] = useState<{ assessments: any[]; reviewers: any[]; talentPools: any[] }>({
    assessments: [],
    reviewers: [],
    talentPools: [],
  })
  const [actionData, setActionData] = useState({
    assessmentId: '',
    reviewerUserId: '',
    talentPoolId: '',
    subject: '',
    message: '',
    personnelNumbersText: '',
    interviewTitle: '',
    interviewFirstStart: '',
    interviewDurationMinutes: 45,
    interviewGapMinutes: 15,
    interviewTimezone: 'Africa/Lagos',
    interviewFormat: 'VIRTUAL',
    interviewVenue: '',
    interviewMeetingLink: '',
    interviewInstructions: '',
    interviewQuestion: '',
    interviewSafeguardingQuestion: '',
    interviewPanelUserIds: [] as string[],
    reason: '',
  })
  const [actionPreview, setActionPreview] = useState<any>(null)
  const [receipt, setReceipt] = useState<{
    runId: string
    action: string
    completed: number
    failures: number
    reversible: boolean
  } | null>(null)

  useEffect(() => {
    fetch('/api/recruitment/applications/bulk-actions')
      .then(async (response) => (response.ok ? setOptions(await response.json()) : undefined))
      .catch(() => undefined)
  }, [])

  async function previewChange() {
    if (reason.trim().length < 3) return setError('Give a short reason for the stage change.')
    setBusy(true)
    setError('')
    const response = await fetch('/api/recruitment/applications/bulk-stage-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationIds: applications.map((application) => application.id),
        toStatus,
        candidateVisibleStatus: candidateStatus[toStatus] || 'UNDER_REVIEW',
        reason,
        previewOnly: true,
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return setError(body.error || 'Could not preview this change.')
    setPreview(body)
  }

  async function applyChange() {
    if (!preview?.eligible?.length) return
    setBusy(true)
    const response = await fetch('/api/recruitment/applications/bulk-stage-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationIds: preview.eligible.map((application: any) => application.id),
        toStatus,
        candidateVisibleStatus: candidateStatus[toStatus] || 'UNDER_REVIEW',
        reason,
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return setError(body.error || 'Could not complete the stage change.')
    toast('success', `${body.count} application${body.count === 1 ? '' : 's'} updated.`)
    setReceipt({
      runId: body.runId,
      action: 'STAGE_CHANGE',
      completed: body.count,
      failures: 0,
      reversible: true,
    })
    setOpen(false)
    setPreview(null)
    setReason('')
    router.refresh()
  }

  async function runGeneric(previewOnly: boolean) {
    if (actionData.reason.trim().length < 3) return setError('Give a short reason for this action.')
    setBusy(true)
    setError('')
    const response = await fetch('/api/recruitment/applications/bulk-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: bulkAction,
        applicationIds: applications.map((item) => item.id),
        previewOnly,
        ...actionData,
        ...(bulkAction === 'ERP_TRANSFER'
          ? {
              personnelNumbers: Object.fromEntries(
                actionData.personnelNumbersText
                  .split('\n')
                  .map((line) => line.split(',').map((value) => value.trim()))
                  .filter(([applicationId, number]) => applicationId && number)
                  .map(([applicationId, number]) => [applicationId, number])
              ),
            }
          : {}),
        ...(bulkAction === 'INTERVIEW_SCHEDULE'
          ? {
              interview: {
                title: actionData.interviewTitle,
                firstStart: actionData.interviewFirstStart,
                durationMinutes: actionData.interviewDurationMinutes,
                gapMinutes: actionData.interviewGapMinutes,
                timezone: actionData.interviewTimezone,
                format: actionData.interviewFormat,
                venue: actionData.interviewVenue || undefined,
                meetingLink: actionData.interviewMeetingLink || undefined,
                instructions: actionData.interviewInstructions || undefined,
                panelUserIds: actionData.interviewPanelUserIds,
                question: actionData.interviewQuestion,
                safeguardingQuestion: actionData.interviewSafeguardingQuestion,
              },
            }
          : {}),
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return setError(body.error || 'Could not complete this bulk action.')
    if (previewOnly) return setActionPreview(body)
    toast(
      body.failures?.length ? 'info' : 'success',
      `${body.completed} application${body.completed === 1 ? '' : 's'} completed${body.failures?.length ? `; ${body.failures.length} could not be completed.` : '.'}`
    )
    const reversible = ['ASSIGN_REVIEWER', 'TALENT_POOL'].includes(bulkAction)
    setReceipt({
      runId: body.runId,
      action: bulkAction,
      completed: body.completed,
      failures: body.failures?.length || 0,
      reversible,
    })
    setMoreOpen(false)
    setActionPreview(null)
    if (!reversible) onClear()
    router.refresh()
  }

  async function undo() {
    if (!receipt?.reversible) return
    setBusy(true)
    const response = await fetch(`/api/recruitment/applications/bulk-actions/${receipt.runId}/undo`, { method: 'POST' })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) return toast('error', body.error || 'Could not undo this action.')
    toast('success', 'Bulk action undone. The receipt remains in the audit trail.')
    setReceipt(null)
    onClear()
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-brand-950">
          {applications.length} application{applications.length === 1 ? '' : 's'} selected
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClear} className="btn-secondary">
            Clear selection
          </button>
          <button type="button" onClick={() => setOpen(true)} className="btn-primary">
            Change stage
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(true)
              setActionPreview(null)
              setError('')
            }}
            className="btn-secondary"
          >
            More actions
          </button>
          <a
            href={`/api/recruitment/applications/bulk-export?ids=${applications.map((item) => encodeURIComponent(item.id)).join(',')}`}
            className="btn-secondary"
          >
            Export selected
          </a>
        </div>
      </div>
      {receipt && (
        <div
          role="status"
          className="flex flex-col justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-semibold text-emerald-950">Action receipt {receipt.runId.slice(0, 8)}</p>
            <p className="mt-1 text-xs text-emerald-800">
              {receipt.completed} completed · {receipt.failures} failed ·{' '}
              {receipt.action.replaceAll('_', ' ').toLowerCase()}
            </p>
          </div>
          {receipt.reversible && (
            <button disabled={busy} onClick={() => void undo()} className="btn-secondary">
              {busy ? 'Undoing…' : 'Undo within 15 minutes'}
            </button>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          setPreview(null)
          setError('')
        }}
        title="Preview bulk stage change"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            The system checks every selected application before anything changes. Ineligible records will be left
            untouched.
          </p>
          <label className="block">
            <span className="field-label">New stage</span>
            <select
              value={toStatus}
              onChange={(event) => {
                setToStatus(event.target.value)
                setPreview(null)
              }}
              className="field-control"
            >
              <option value="UNDER_REVIEW">Under review</option>
              <option value="LONGLISTED">Longlisted</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="NOT_SELECTED">Not selected</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Reason</span>
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setPreview(null)
              }}
              rows={3}
              className="field-control"
              placeholder="Why are these applications moving?"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          {preview && (
            <div className="space-y-3" role="status">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">Ready to update</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-950">{preview.eligible.length}</p>
                </div>
                <div className="border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">Will not change</p>
                  <p className="mt-1 text-2xl font-bold text-amber-950">{preview.invalid.length}</p>
                </div>
              </div>
              {preview.invalid.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-200">
                  <ul className="divide-y divide-slate-200">
                    {preview.invalid.map((item: any) => (
                      <li key={item.id} className="p-3 text-xs">
                        <p className="font-semibold text-slate-900">
                          {item.candidate} {item.vacancy && `· ${item.vacancy}`}
                        </p>
                        <p className="mt-1 text-amber-800">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            {!preview ? (
              <button type="button" disabled={busy} onClick={previewChange} className="btn-primary">
                {busy ? 'Checking…' : 'Preview change'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || preview.eligible.length === 0}
                onClick={applyChange}
                className="btn-primary"
              >
                {busy ? 'Updating…' : `Update ${preview.eligible.length}`}
              </button>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false)
          setActionPreview(null)
          setError('')
        }}
        title="Preview bulk action"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Review the selected applications before continuing. Any application that cannot use this action will stay
            unchanged, with the reason shown below.
          </p>
          <label className="block">
            <span className="field-label">Action</span>
            <select
              value={bulkAction}
              onChange={(event) => {
                setBulkAction(event.target.value)
                setActionPreview(null)
              }}
              className="field-control"
            >
              <option value="MESSAGE">Send rejection, hold or update message</option>
              <option value="ASSESSMENT_INVITE">Invite to assessment</option>
              <option value="INTERVIEW_INVITE">Send scheduled interview invitations</option>
              <option value="INTERVIEW_SCHEDULE">Schedule sequential interviews</option>
              <option value="ASSIGN_REVIEWER">Assign reviewer</option>
              <option value="REFERENCE_REMINDER">Send reference reminder</option>
              <option value="REFERENCE_REQUEST">Send pending reference requests</option>
              <option value="DOCUMENT_REQUEST">Request documents</option>
              <option value="ERP_TRANSFER">Record ERP personnel numbers</option>
              <option value="TALENT_POOL">Place in talent pool</option>
            </select>
          </label>
          {bulkAction === 'ASSESSMENT_INVITE' && (
            <label className="block">
              <span className="field-label">Assessment</span>
              <select
                required
                value={actionData.assessmentId}
                onChange={(event) => {
                  setActionData({ ...actionData, assessmentId: event.target.value })
                  setActionPreview(null)
                }}
                className="field-control"
              >
                <option value="">Choose assessment</option>
                {options.assessments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {['ASSIGN_REVIEWER', 'ASSESSMENT_INVITE'].includes(bulkAction) && (
            <label className="block">
              <span className="field-label">Reviewer</span>
              <select
                required
                value={actionData.reviewerUserId}
                onChange={(event) => {
                  setActionData({ ...actionData, reviewerUserId: event.target.value })
                  setActionPreview(null)
                }}
                className="field-control"
              >
                <option value="">Choose reviewer</option>
                {options.reviewers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          {bulkAction === 'TALENT_POOL' && (
            <label className="block">
              <span className="field-label">Talent pool</span>
              <select
                required
                value={actionData.talentPoolId}
                onChange={(event) => {
                  setActionData({ ...actionData, talentPoolId: event.target.value })
                  setActionPreview(null)
                }}
                className="field-control"
              >
                <option value="">Choose talent pool</option>
                {options.talentPools.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {['MESSAGE', 'DOCUMENT_REQUEST'].includes(bulkAction) && (
            <>
              <label className="block">
                <span className="field-label">Subject</span>
                <input
                  required
                  value={actionData.subject}
                  onChange={(event) => {
                    setActionData({ ...actionData, subject: event.target.value })
                    setActionPreview(null)
                  }}
                  className="field-control"
                />
              </label>
              <label className="block">
                <span className="field-label">Final message</span>
                <textarea
                  required
                  rows={5}
                  value={actionData.message}
                  onChange={(event) => {
                    setActionData({ ...actionData, message: event.target.value })
                    setActionPreview(null)
                  }}
                  className="field-control"
                />
                <span className="field-help">
                  Candidates will receive this message as written. Check the wording before continuing.
                </span>
              </label>
            </>
          )}
          {bulkAction === 'ERP_TRANSFER' && (
            <label className="block">
              <span className="field-label">Application ID and ERP personnel number</span>
              <textarea
                required
                rows={Math.min(10, Math.max(4, applications.length))}
                value={actionData.personnelNumbersText}
                onChange={(event) => {
                  setActionData({ ...actionData, personnelNumbersText: event.target.value })
                  setActionPreview(null)
                }}
                className="field-control font-mono text-xs"
                placeholder={applications.map((item) => `${item.id}, ERP-NUMBER`).join('\n')}
              />
              <span className="field-help">One selected application per line. Preview validates approval, resumption and duplicates before writing.</span>
            </label>
          )}
          {bulkAction === 'INTERVIEW_INVITE' && (
            <label className="block">
              <span className="field-label">Optional invitation note</span>
              <textarea
                rows={3}
                value={actionData.message}
                onChange={(event) => {
                  setActionData({ ...actionData, message: event.target.value })
                  setActionPreview(null)
                }}
                className="field-control"
              />
            </label>
          )}
          {bulkAction === 'INTERVIEW_SCHEDULE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="field-label">Interview title</span><input required value={actionData.interviewTitle} onChange={(event) => setActionData({ ...actionData, interviewTitle: event.target.value })} className="field-control" /></label>
              <label className="block"><span className="field-label">First slot</span><input required type="datetime-local" value={actionData.interviewFirstStart} onChange={(event) => setActionData({ ...actionData, interviewFirstStart: event.target.value })} className="field-control" /></label>
              <label className="block"><span className="field-label">Time zone</span><input required value={actionData.interviewTimezone} onChange={(event) => setActionData({ ...actionData, interviewTimezone: event.target.value })} className="field-control" /></label>
              <label className="block"><span className="field-label">Minutes per candidate</span><input type="number" min={10} value={actionData.interviewDurationMinutes} onChange={(event) => setActionData({ ...actionData, interviewDurationMinutes: Number(event.target.value) })} className="field-control" /></label>
              <label className="block"><span className="field-label">Gap minutes</span><input type="number" min={0} value={actionData.interviewGapMinutes} onChange={(event) => setActionData({ ...actionData, interviewGapMinutes: Number(event.target.value) })} className="field-control" /></label>
              <label className="block"><span className="field-label">Format</span><select value={actionData.interviewFormat} onChange={(event) => setActionData({ ...actionData, interviewFormat: event.target.value })} className="field-control"><option>VIRTUAL</option><option>PHYSICAL</option><option>HYBRID</option></select></label>
              <label className="block"><span className="field-label">Venue</span><input value={actionData.interviewVenue} onChange={(event) => setActionData({ ...actionData, interviewVenue: event.target.value })} className="field-control" /></label>
              <label className="block sm:col-span-2"><span className="field-label">Meeting link</span><input type="url" value={actionData.interviewMeetingLink} onChange={(event) => setActionData({ ...actionData, interviewMeetingLink: event.target.value })} className="field-control" /></label>
              <label className="block sm:col-span-2"><span className="field-label">Panel members</span><select multiple required value={actionData.interviewPanelUserIds} onChange={(event) => setActionData({ ...actionData, interviewPanelUserIds: Array.from(event.target.selectedOptions, (option) => option.value) })} className="field-control min-h-28">{options.reviewers.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="field-label">Scorecard question / criterion</span><textarea required value={actionData.interviewQuestion} onChange={(event) => setActionData({ ...actionData, interviewQuestion: event.target.value })} className="field-control" /></label>
              <label className="block sm:col-span-2"><span className="field-label">Safeguarding question</span><textarea required value={actionData.interviewSafeguardingQuestion} onChange={(event) => setActionData({ ...actionData, interviewSafeguardingQuestion: event.target.value })} className="field-control" /></label>
              <label className="block sm:col-span-2"><span className="field-label">Candidate instructions</span><textarea value={actionData.interviewInstructions} onChange={(event) => setActionData({ ...actionData, interviewInstructions: event.target.value })} className="field-control" /></label>
            </div>
          )}
          <label className="block">
            <span className="field-label">Accountability reason</span>
            <textarea
              required
              rows={2}
              value={actionData.reason}
              onChange={(event) => {
                setActionData({ ...actionData, reason: event.target.value })
                setActionPreview(null)
              }}
              className="field-control"
            />
          </label>
          {error && (
            <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          {actionPreview && (
            <div className="space-y-3" role="status">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">Can proceed</p>
                  <p className="mt-1 text-2xl font-bold">{actionPreview.eligible.length}</p>
                </div>
                <div className="border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">Will stay unchanged</p>
                  <p className="mt-1 text-2xl font-bold">{actionPreview.invalid.length}</p>
                </div>
              </div>
              {actionPreview.eligible.length > 0 && (
                <ul className="max-h-40 divide-y overflow-y-auto border border-emerald-200">
                  {actionPreview.eligible.map((item: any) => (
                    <li key={item.id} className="p-3 text-xs">
                      <p className="font-semibold">{item.candidate} · {item.vacancy}</p>
                      <p className="mt-1 text-emerald-800">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
              {actionPreview.invalid.length > 0 && (
                <ul className="max-h-40 divide-y overflow-y-auto border border-slate-200">
                  {actionPreview.invalid.map((item: any) => (
                    <li key={item.id} className="p-3 text-xs">
                      <p className="font-semibold">
                        {item.candidate} · {item.vacancy}
                      </p>
                      <p className="mt-1 text-amber-800">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setMoreOpen(false)} className="btn-secondary">
              Cancel
            </button>
            {!actionPreview ? (
              <button disabled={busy} onClick={() => void runGeneric(true)} className="btn-primary">
                {busy ? 'Checking…' : 'Preview impact'}
              </button>
            ) : (
              <button
                disabled={busy || !actionPreview.eligible.length}
                onClick={() => void runGeneric(false)}
                className="btn-primary"
              >
                {busy ? 'Working…' : `Continue with ${actionPreview.eligible.length}`}
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  )
}
