'use client'

import { useState } from 'react'
import { FileText, Loader2, ChevronDown } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

/**
 * A candidate's read-only view of the answers they submitted.
 *
 * Candidates previously had no way to see what they had sent, which makes an
 * assessment result impossible to sanity-check. Correct answers, per-question
 * marks and marker comments are deliberately not returned by the endpoint.
 */

interface ReviewQuestion {
  position: number
  prompt: string
  questionType: string
  answerDisplay: string
}

interface Review {
  assessment: { title: string; type: string }
  status: string
  submittedAt: string | null
  autoSubmitted: boolean
  score: number | null
  passed: boolean | null
  questions: ReviewQuestion[]
}

export default function AssessmentSubmissionReview({ candidateAssessmentId }: { candidateAssessmentId: string }) {
  const [review, setReview] = useState<Review | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/candidate/assessments/${candidateAssessmentId}/answers/review`)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not load your answers')
        return
      }
      setReview(data)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden />
          )}
          Review my answers
        </button>
        {error && (
          <p role="alert" className="ml-3 self-center text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (!review) return null

  return (
    <div className="mt-2 rounded-xl border border-slate-300 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-900">
          Your answers · submitted{' '}
          {review.submittedAt ? formatDateTime(review.submittedAt) : 'recently'}
          {review.autoSubmitted && ' (submitted automatically when time ran out)'}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"
        >
          <ChevronDown className="h-4 w-4 rotate-180" aria-hidden /> Hide
        </button>
      </div>
      <ol className="divide-y divide-slate-100">
        {review.questions.map((question) => (
          <li key={question.position} className="p-3">
            <p className="text-xs font-semibold text-slate-900">
              {question.position}. {question.prompt}
            </p>
            <p
              className={`mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs ${
                question.answerDisplay.startsWith('—') ? 'italic text-slate-500' : 'text-slate-800'
              }`}
            >
              {question.answerDisplay}
            </p>
          </li>
        ))}
      </ol>
      {review.score !== null && (
        <p className="border-t border-slate-200 p-3 text-xs font-bold text-slate-900">
          Result: {review.score}%{review.passed === null ? '' : review.passed ? ' — passed' : ' — not passed'}
        </p>
      )}
    </div>
  )
}
