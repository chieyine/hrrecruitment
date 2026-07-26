'use client'

import { useEffect, useState } from 'react'
import { NotebookPen, UserCheck, RotateCcw, Loader2, Eye } from 'lucide-react'

/**
 * The governance actions on an application that had working endpoints but no
 * way to reach them: adding a case note, assigning a reviewer, and reopening a
 * submitted scorecard.
 *
 * The "Case notes" panel on this page could previously only ever read
 * "No case notes recorded", because nothing called POST .../notes.
 */

interface Scorecard {
  id: string
  status: string
  scorecardType?: string | null
  reviewerName?: string | null
}

const NOTE_CATEGORIES = [
  ['GENERAL', 'General'],
  ['SCREENING', 'Screening'],
  ['INTERVIEW', 'Interview'],
  ['REFERENCE', 'Reference'],
  ['DECISION', 'Decision rationale'],
  ['SAFEGUARDING', 'Safeguarding'],
] as const

export default function CaseGovernanceActions({
  applicationId,
  assignedReviewerId,
  scorecards = [],
  onChanged,
}: {
  applicationId: string
  assignedReviewerId?: string | null
  scorecards?: Scorecard[]
  onChanged?: () => void
}) {
  const [reviewers, setReviewers] = useState<Array<{ id: string; email: string }>>([])
  const [reviewerId, setReviewerId] = useState(assignedReviewerId ?? '')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<string>('GENERAL')
  const [restricted, setRestricted] = useState(false)
  const [reopenId, setReopenId] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [viewedScorecard, setViewedScorecard] = useState<any>(null)

  useEffect(() => {
    // The bulk-actions endpoint already returns the eligible reviewer list, so
    // reuse it rather than adding a second source of truth.
    const controller = new AbortController()
    fetch('/api/recruitment/applications/bulk-actions', { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : { reviewers: [] })
      .then((data) => setReviewers(data.reviewers ?? []))
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setMessage('Reviewer options could not be loaded')
      })
    return () => controller.abort()
  }, [])

  const post = async (url: string, body: unknown, label: string, success: string) => {
    setBusy(label)
    setMessage('')
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || 'That did not work')
        return false
      }
      setMessage(success)
      onChanged?.()
      return true
    } finally {
      setBusy(null)
    }
  }

  const reopenable = scorecards.filter((scorecard) => scorecard.status === 'SUBMITTED')
  const spinner = (label: string) => busy === label && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
  const viewScorecard = async (id: string) => {
    setBusy(`view:${id}`)
    setMessage('')
    const response = await fetch(`/api/recruitment/scorecards/${id}`)
    const data = await response.json().catch(() => ({}))
    setBusy(null)
    if (!response.ok) {
      setMessage(data.error || 'The scorecard could not be loaded')
      return
    }
    setViewedScorecard(data.scorecard)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ---- case note ---- */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <NotebookPen className="h-4 w-4 text-blue-700" aria-hidden /> Add a case note
        </h4>
        <p className="mt-1 text-xs text-slate-600">Part of the accountable record. Notes cannot be edited once saved.</p>

        <label htmlFor="note-category" className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Category
        </label>
        <select
          id="note-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
        >
          {NOTE_CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="note-content" className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Note
        </label>
        <textarea
          id="note-content"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={10_000}
          className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          placeholder="What was decided, observed or agreed, and why."
        />

        <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={restricted} onChange={(event) => setRestricted(event.target.checked)} />
          Restricted — visible only to staff with restricted access
        </label>

        <button
          type="button"
          onClick={async () => {
            if (await post(
              `/api/recruitment/applications/${applicationId}/notes`,
              { content: note, category, restricted },
              'note',
              'Case note saved'
            )) {
              setNote('')
              setRestricted(false)
            }
          }}
          disabled={note.trim().length === 0 || busy !== null}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {spinner('note')}Save note
        </button>
      </div>

      <div className="space-y-4">
        {/* ---- reviewer assignment ---- */}
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UserCheck className="h-4 w-4 text-emerald-700" aria-hidden /> Assigned reviewer
          </h4>
          <p className="mt-1 text-xs text-slate-600">
            The reviewer gains scoped access to this case. Only staff configured to review appear here.
          </p>

          <label htmlFor="reviewer-select" className="sr-only">
            Reviewer
          </label>
          <select
            id="reviewer-select"
            value={reviewerId}
            onChange={(event) => setReviewerId(event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm"
          >
            <option value="">Not assigned</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.email}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              post(
                `/api/recruitment/applications/${applicationId}/assign-reviewer`,
                { reviewerUserId: reviewerId },
                'reviewer',
                'Reviewer assigned'
              )
            }
            disabled={!reviewerId || reviewerId === assignedReviewerId || busy !== null}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {spinner('reviewer')}Assign
          </button>
        </div>

        {/* ---- scorecard reopen ---- */}
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <RotateCcw className="h-4 w-4 text-amber-700" aria-hidden /> Reopen a submitted scorecard
          </h4>
          <p className="mt-1 text-xs text-slate-600">
            Reopening is recorded against the reviewer and appears in the decision-quality report.
          </p>

          {reopenable.length === 0 ? (
            <p className="mt-3 text-xs italic text-slate-500">No submitted scorecards to reopen.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-slate-100 border border-slate-200">
                {reopenable.map((scorecard) => (
                  <li key={scorecard.id} className="flex items-center justify-between gap-3 p-2 text-xs">
                    <span className="font-semibold text-slate-800">{scorecard.scorecardType || 'Screening scorecard'}{scorecard.reviewerName ? ` — ${scorecard.reviewerName}` : ''}</span>
                    <button type="button" onClick={() => void viewScorecard(scorecard.id)} disabled={busy !== null} className="inline-flex items-center gap-1 font-bold text-blue-700 disabled:opacity-50">
                      {busy === `view:${scorecard.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />} View evidence
                    </button>
                  </li>
                ))}
              </ul>
              {viewedScorecard && (
                <div className="mt-3 border border-blue-200 bg-blue-50 p-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold text-blue-950">{viewedScorecard.scorecardTemplate?.name || 'Submitted scorecard'}</p><p className="mt-1 text-blue-800">Total: {viewedScorecard.totalScore ?? 'Not calculated'} · {viewedScorecard.status} · version {viewedScorecard.version ?? 1}</p></div>
                    <button type="button" onClick={() => setViewedScorecard(null)} className="font-bold text-blue-800">Close</button>
                  </div>
                  <dl className="mt-3 space-y-2">
                    {(viewedScorecard.criterionScores || []).map((score: any) => {
                      const criterion = viewedScorecard.scorecardTemplate?.criteria?.find((item: any) => item.id === score.criterionId)
                      return <div key={score.id} className="border-t border-blue-200 pt-2"><dt className="font-bold text-slate-900">{criterion?.name || 'Criterion'} — {score.score}/{criterion?.maximumScore ?? '—'}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{score.comment || 'No comment recorded.'}</dd></div>
                    })}
                  </dl>
                  {(() => {
                    const previous = JSON.parse(viewedScorecard.previousVersionsJson || '[]')
                    return previous.length > 0 ? (
                      <p className="mt-3 border-t border-blue-200 pt-2 text-blue-900">
                        {previous.length} previous submitted version{previous.length === 1 ? '' : 's'} retained in the audit record.
                      </p>
                    ) : null
                  })()}
                </div>
              )}
              <label htmlFor="reopen-select" className="sr-only">
                Scorecard
              </label>
              <select
                id="reopen-select"
                value={reopenId}
                onChange={(event) => setReopenId(event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">Choose a scorecard</option>
                {reopenable.map((scorecard) => (
                  <option key={scorecard.id} value={scorecard.id}>
                    {scorecard.scorecardType || 'Scorecard'}
                    {scorecard.reviewerName ? ` — ${scorecard.reviewerName}` : ''}
                  </option>
                ))}
              </select>

              <input
                value={reopenReason}
                onChange={(event) => setReopenReason(event.target.value)}
                placeholder="Reason (at least 5 characters)"
                className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
                aria-label="Reason for reopening"
              />

              <button
                type="button"
                onClick={async () => {
                  if (await post(
                    `/api/recruitment/scorecards/${reopenId}/reopen`,
                    { reason: reopenReason },
                    'reopen',
                    'Scorecard reopened'
                  )) {
                    setReopenId('')
                    setReopenReason('')
                  }
                }}
                disabled={!reopenId || reopenReason.trim().length < 5 || busy !== null}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {spinner('reopen')}Reopen
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <p role="status" className="md:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">
          {message}
        </p>
      )}
    </div>
  )
}
