'use client'

import { useState } from 'react'
import { FileText, Loader2, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'

/**
 * Shows a marker what the candidate actually submitted, and lets them award
 * per-question marks.
 *
 * This is the panel that closes the gap where a marker was asked for a score
 * out of 100 with no view of the submission at all.
 */

interface ReviewQuestion {
  position: number
  questionId: string
  questionType: string
  prompt: string
  options: string[]
  maximumScore: number
  answerDisplay: string
  answered: boolean
  expectedAnswerDisplay: string | null
  requiresHumanMark: boolean
  score: number | null
  markerComment: string | null
}

interface Review {
  candidateAssessment: { id: string; status: string; submittedAt: string | null; autoSubmitted: boolean; score: number | null }
  assessment: { title: string; type: string; passMark: number }
  candidate: { name: string; vacancy: string }
  questions: ReviewQuestion[]
  totals: { questions: number; answered: number; awaitingHumanMark: number; maximumScore: number; awardedScore: number }
}

export default function AssessmentAnswerReview({
  candidateAssessmentId,
  candidateName,
}: {
  candidateAssessmentId: string
  candidateName: string
}) {
  const [review, setReview] = useState<Review | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [marks, setMarks] = useState<Record<string, { score: string; comment: string }>>({})

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/candidate-assessments/${candidateAssessmentId}/answers`)
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Could not load the submission')
        return
      }
      setReview(data)
      setMarks(
        Object.fromEntries(
          (data.questions as ReviewQuestion[]).map((question) => [
            question.questionId,
            { score: question.score === null ? '' : String(question.score), comment: question.markerComment ?? '' },
          ])
        )
      )
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const saveMarks = async () => {
    if (!review) return
    const payload = review.questions
      .filter((question) => marks[question.questionId]?.score !== '')
      .map((question) => ({
        questionId: question.questionId,
        score: Number(marks[question.questionId].score),
        comment: marks[question.questionId].comment || undefined,
      }))
    if (!payload.length) {
      setMessage('Enter at least one mark first')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/candidate-assessments/${candidateAssessmentId}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: payload }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Could not save the marks')
        return
      }
      setMessage(
        `Saved. ${data.awardedScore} of ${data.maximumScore}` +
          (data.percentage !== null ? ` (${data.percentage}%) — use this as the overall score.` : '')
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileText className="h-3.5 w-3.5" aria-hidden />}
        View submitted answers
        {message && <span className="ml-2 font-medium text-rose-700">{message}</span>}
      </button>
    )
  }

  if (!review) return null

  const runningTotal = review.questions.reduce((sum, question) => {
    const entry = marks[question.questionId]?.score
    return sum + (entry === '' || entry === undefined ? 0 : Number(entry))
  }, 0)

  return (
    <div className="mt-3 rounded-2xl border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-950">
            {review.assessment.title} — {candidateName || review.candidate.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {review.candidate.vacancy} · {review.totals.answered} of {review.totals.questions} answered
            {review.candidateAssessment.autoSubmitted && ' · auto-submitted when time expired'}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
          <ChevronDown className="h-4 w-4 rotate-180" aria-hidden /> Hide
        </button>
      </div>

      {review.totals.awaitingHumanMark > 0 && (
        <p className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {review.totals.awaitingHumanMark} free-text answer{review.totals.awaitingHumanMark === 1 ? '' : 's'} still need a mark.
        </p>
      )}

      <ol className="divide-y divide-slate-100">
        {review.questions.map((question) => (
          <li key={question.questionId} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {question.position}. {question.prompt}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {question.questionType.replaceAll('_', ' ')} · {question.maximumScore} marks
              </span>
            </div>

            <div className="mt-2 rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Candidate answer</p>
              <p className={`mt-1 whitespace-pre-wrap text-sm ${question.answered ? 'text-slate-900' : 'italic text-slate-500'}`}>
                {question.answerDisplay}
              </p>
            </div>

            {question.expectedAnswerDisplay && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-bold uppercase tracking-wider text-slate-500">Expected</span>{' '}
                <span className="font-mono">{question.expectedAnswerDisplay}</span>
                {question.answered && (
                  <span
                    className={`ml-2 font-bold ${
                      question.answerDisplay.trim().toLowerCase() === question.expectedAnswerDisplay.trim().toLowerCase()
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {question.answerDisplay.trim().toLowerCase() === question.expectedAnswerDisplay.trim().toLowerCase()
                      ? 'matches'
                      : 'does not match'}
                  </span>
                )}
              </p>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mark
                <input
                  type="number"
                  min={0}
                  max={question.maximumScore}
                  step="0.5"
                  value={marks[question.questionId]?.score ?? ''}
                  onChange={(event) =>
                    setMarks((current) => ({
                      ...current,
                      [question.questionId]: { ...current[question.questionId], score: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  aria-label={`Mark out of ${question.maximumScore} for question ${question.position}`}
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Marker note (optional)
                <input
                  value={marks[question.questionId]?.comment ?? ''}
                  onChange={(event) =>
                    setMarks((current) => ({
                      ...current,
                      [question.questionId]: { ...current[question.questionId], comment: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Reasoning for this mark"
                />
              </label>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
        <p className="text-sm font-bold text-slate-900">
          Running total: {runningTotal} / {review.totals.maximumScore}
          {review.totals.maximumScore > 0 && (
            <span className="ml-2 font-normal text-slate-600">
              ({Math.round((runningTotal / review.totals.maximumScore) * 1000) / 10}% · pass mark {review.assessment.passMark})
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={saveMarks}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
          Save per-question marks
        </button>
      </div>

      {message && (
        <p role="status" className="border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-800">
          {message}
        </p>
      )}
    </div>
  )
}
