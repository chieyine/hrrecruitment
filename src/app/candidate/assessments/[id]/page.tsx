'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { Clock, CheckCircle2, Send } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { formatDateTime } from '@/lib/utils'

export default function CandidateAssessmentRunnerPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(0)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [assessment, setAssessment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [starting, setStarting] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [confirmingSubmission, setConfirmingSubmission] = useState(false)

  const startAssessment = useCallback(async () => {
    setStarting(true)
    setLoadError('')
    try {
      const response = await fetch(`/api/candidate/assessments/${params.id}/start`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not start assessment')
      setAssessment(data.assessment)
      setTimeLeft(data.assessment.secondsRemaining)
      setEndsAt(Date.now() + data.assessment.secondsRemaining * 1000)
      setAnswers(data.assessment.savedAnswers ?? {})
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not start assessment')
    } finally {
      setStarting(false)
    }
  }, [params.id])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/candidate/assessments/${params.id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not open assessment')
        setAssessment(data.assessment)
        if (data.assessment.status === 'IN_PROGRESS') await startAssessment()
        if (['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(data.assessment.status))
          setCompleted(true)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Could not open assessment')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [params.id, startAssessment])

  useEffect(() => {
    if (!assessment || completed || Object.keys(answers).length === 0) return
    const timer = setTimeout(async () => {
      setSaveStatus('Saving…')
      const response = await fetch(`/api/candidate/assessments/${params.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
      })
      setSaveStatus(response.ok ? 'Draft answers saved' : 'Could not save draft answers; keep this page open')
    }, 800)
    return () => clearTimeout(timer)
  }, [answers, assessment, completed, params.id])

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submitting || completed) return
      setSubmitting(true)
      try {
        const res = await fetch(`/api/candidate/assessments/${params.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, autoSubmitted }),
        })
        const data = await res.json()
        if (res.ok) {
          setCompleted(true)
        } else setLoadError(data.error || 'Assessment submission failed')
      } catch {
        setLoadError('Assessment submission failed. Your draft answers remain saved; please retry.')
      } finally {
        setSubmitting(false)
      }
    },
    [answers, completed, params.id, submitting]
  )

  useEffect(() => {
    if (!assessment || assessment.status !== 'IN_PROGRESS' || completed || !endsAt) return
    const update = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        if (assessment.autoSubmit) void handleSubmit(true)
        else setLoadError('The assessment time has ended. Your saved answers cannot be submitted after the deadline.')
      }
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [assessment, completed, endsAt, handleSubmit])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const uploadAssessmentFile = async (questionId: string, file?: File) => {
    if (!file) return
    try {
      setSaveStatus('Uploading file…')
      const form = new FormData()
      form.append('file', file)
      form.append('sensitivityClass', 'CONFIDENTIAL')
      const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const body = await response.json()
      if (response.ok) {
        setAnswers({ ...answers, [questionId]: body.fileAssetId })
        setSaveStatus(`${file.name} uploaded`)
      } else setSaveStatus(body.error || 'File upload failed')
    } catch {
      setSaveStatus('File upload failed. Check your connection and try again.')
    }
  }

  const unansweredQuestions =
    assessment?.questions?.filter(
      (question: any) =>
        answers[question.id] === undefined ||
        answers[question.id] === '' ||
        (Array.isArray(answers[question.id]) && !answers[question.id].length)
    ) || []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-4xl space-y-6">
          <section className="section-panel flex flex-col justify-between gap-4 px-5 py-5 md:flex-row md:items-center sm:px-6">
            <div>
              <p className="editorial-kicker">Assessment</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-.025em] text-navy-900">
                {assessment?.title || 'Candidate assessment'}
              </h1>
            </div>

            {!completed && assessment?.status === 'IN_PROGRESS' && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-mono text-lg font-semibold text-amber-900">
                <Clock className="h-5 w-5 text-amber-700" />
                <span>
                  <span className="sr-only">Time remaining: </span>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </section>

          {loading ? (
            <div className="section-panel px-6 py-14 text-center text-sm text-stone-500">Loading assessment…</div>
          ) : loadError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
              {loadError}
            </div>
          ) : completed ? (
            <div className="section-panel space-y-4 p-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h2 className="text-2xl font-extrabold text-slate-900">Assessment submitted</h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
                Your answers were recorded. The recruitment team will contact you when there is an update.
              </p>
              <button onClick={() => router.push('/candidate/tasks')} className="btn-primary">
                Back to To do
              </button>
            </div>
          ) : assessment?.status !== 'IN_PROGRESS' ? (
            <div className="section-panel space-y-5 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-navy-900">Before you begin</h2>
              <p className="text-sm leading-6 text-stone-600">
                {assessment?.description || 'Read the instructions carefully before starting.'}
              </p>
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                You will have {assessment?.durationMinutes} minutes. The timer continues if you close or leave this
                page, and your draft answers save as you work.
                {assessment?.closesAt ? ` This assessment closes ${formatDateTime(assessment.closesAt)}.` : ''}
              </p>
              <button onClick={startAssessment} disabled={starting || !assessment} className="btn-primary">
                {starting ? 'Starting…' : 'Start assessment'}
              </button>
            </div>
          ) : (
            <div className="section-panel space-y-6 p-5 sm:p-8">
              {formError && (
                <div role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {formError}
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-b pb-4" aria-label="Question navigator">
                {assessment?.questions?.map((question: any, index: number) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    aria-current={currentQuestion === index ? 'step' : undefined}
                    className={`h-9 w-9 rounded-full border text-xs font-bold ${currentQuestion === index ? 'border-brand-700 bg-brand-700 text-white' : answers[question.id] !== undefined && answers[question.id] !== '' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="space-y-4 text-xs">
                {assessment?.questions?.map((question: any, index: number) => {
                  let options: string[] = []
                  try {
                    options = question.optionsJson ? JSON.parse(question.optionsJson) : []
                  } catch {}
                  if (question.questionType === 'TRUEFALSE' && options.length === 0) options = ['True', 'False']
                  if (index !== currentQuestion) return null
                  return (
                    <div key={question.id} className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
                      <p className="text-xs font-semibold text-stone-500">
                        Question {index + 1} of {assessment.questions.length}
                      </p>
                      <h2 className="text-base font-semibold leading-6 text-navy-900">{question.prompt}</h2>
                      {['MCQ', 'TRUEFALSE'].includes(question.questionType) ? (
                        <div className="space-y-1.5">
                          {options.map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={answers[question.id] === option}
                                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : question.questionType === 'MULTISELECT' ? (
                        <div className="space-y-1.5">
                          {options.map((option) => {
                            const selected = Array.isArray(answers[question.id]) ? answers[question.id] : []
                            return (
                              <label key={option} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selected.includes(option)}
                                  onChange={(event) =>
                                    setAnswers({
                                      ...answers,
                                      [question.id]: event.target.checked
                                        ? [...selected, option]
                                        : selected.filter((item: string) => item !== option),
                                    })
                                  }
                                />
                                {option}
                              </label>
                            )
                          })}
                        </div>
                      ) : question.questionType === 'FILE' ? (
                        <div>
                          <input
                            aria-label={`Upload answer for question ${index + 1}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(event) => void uploadAssessmentFile(question.id, event.target.files?.[0])}
                          />
                          {answers[question.id] && <p className="mt-1 text-xs text-emerald-700">File attached.</p>}
                        </div>
                      ) : question.questionType === 'NUMBER' ? (
                        <input
                          type="number"
                          value={answers[question.id] ?? ''}
                          onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs"
                        />
                      ) : (
                        <textarea
                          rows={3}
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                          placeholder="Your answer"
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-brand-600 focus:outline-none"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  disabled={currentQuestion === 0}
                  onClick={() => setCurrentQuestion((value) => value - 1)}
                  className="btn-secondary disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentQuestion >= (assessment?.questions?.length || 1) - 1}
                  onClick={() => setCurrentQuestion((value) => value + 1)}
                  className="btn-secondary disabled:opacity-40"
                >
                  Next
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <span role="status" className="mr-auto self-center text-xs text-slate-500">
                  {saveStatus}
                </span>
                <button
                  onClick={() => {
                    if (unansweredQuestions.length) {
                      const firstMissing = assessment.questions.findIndex(
                        (question: any) => question.id === unansweredQuestions[0].id
                      )
                      setCurrentQuestion(Math.max(0, firstMissing))
                      setFormError(
                        `Answer all questions before submitting. ${unansweredQuestions.length} ${
                          unansweredQuestions.length === 1 ? 'question is' : 'questions are'
                        } incomplete.`
                      )
                      return
                    }
                    setFormError('')
                    setConfirmingSubmission(true)
                  }}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Submitting…' : 'Review and submit'}
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <ConfirmDialog
        open={confirmingSubmission}
        onClose={() => {
          if (!submitting) setConfirmingSubmission(false)
        }}
        onConfirm={async () => {
          setConfirmingSubmission(false)
          await handleSubmit(false)
        }}
        title="Submit assessment?"
        description="All answers are complete. You cannot change them after submission."
        confirmLabel="Submit assessment"
        busy={submitting}
      />
    </div>
  )
}
