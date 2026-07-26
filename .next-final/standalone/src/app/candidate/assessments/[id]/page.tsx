'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { Clock, CheckCircle2, Send } from 'lucide-react'

export default function CandidateAssessmentRunnerPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)
  const [loadError, setLoadError] = useState('')
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
      setAnswers(data.assessment.savedAnswers ?? {})
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Could not start assessment') }
    finally { setStarting(false) }
  }, [params.id])

  useEffect(() => {
    fetch(`/api/candidate/assessments/${params.id}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not open assessment')
        setAssessment(data.assessment)
        if (data.assessment.status === 'IN_PROGRESS') await startAssessment()
      })
      .catch((error) => setLoadError(error.message))
  }, [params.id, startAssessment])

  useEffect(() => {
    if (!assessment || completed || Object.keys(answers).length === 0) return
    const timer = setTimeout(async () => {
      setSaveStatus('Saving…')
      const response = await fetch(`/api/candidate/assessments/${params.id}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }) })
      setSaveStatus(response.ok ? 'Draft answers saved' : 'Could not save draft answers; keep this page open')
    }, 800)
    return () => clearTimeout(timer)
  }, [answers, assessment, completed, params.id])

  const handleSubmit = useCallback(async (autoSubmitted = false) => {
    if (submitting || completed) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/candidate/assessments/${params.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, autoSubmitted }),
      })
      const data = await res.json()
      if (res.ok) { setCompleted(true); setResult(data) }
      else setLoadError(data.error || 'Assessment submission failed')
    } catch { setLoadError('Assessment submission failed. Your draft answers remain saved; please retry.') }
    finally { setSubmitting(false) }
  }, [answers, completed, params.id, submitting])

  useEffect(() => {
    if (!assessment || assessment.status !== 'IN_PROGRESS' || completed) return
    if (timeLeft <= 0) { void handleSubmit(true); return }
    const timer = setTimeout(() => setTimeLeft((time) => Math.max(0, time - 1)), 1000)
    return () => clearTimeout(timer)
  }, [assessment, completed, handleSubmit, timeLeft])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const uploadAssessmentFile = async (questionId: string, file?: File) => {
    if (!file) return
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
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header & Timer Bar */}
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                FRAD Online Candidate Assessment
              </span>
              <h1 className="text-2xl font-extrabold mt-2">{assessment?.title || 'Candidate Assessment'}</h1>
            </div>

            {!completed && assessment?.status === 'IN_PROGRESS' && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 px-4 py-2 text-amber-300 font-mono font-bold text-lg">
                <Clock className="h-5 w-5 text-amber-400" />
                Time Remaining: {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {loadError ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{loadError}</div> : completed ? (
            <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm text-center space-y-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h2 className="text-2xl font-extrabold text-slate-900">Assessment submitted</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {result?.requiresMarking ? 'Your answers were recorded and are awaiting HR marking.' : <>Your response score of <strong>{result?.score}%</strong> has been recorded.</>}
              </p>
              <button
                onClick={() => router.push('/candidate/dashboard')}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition-all"
              >
                Return to Candidate Dashboard
              </button>
            </div>
          ) : assessment?.status !== 'IN_PROGRESS' ? (
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-600">{assessment?.description || 'Read the instructions carefully before starting.'}</p>
              <p className="text-xs font-semibold text-slate-500">Once started, you have {assessment?.durationMinutes} minutes. Your timer continues if you leave this page.</p>
              <button onClick={startAssessment} disabled={starting || !assessment} className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-50">
                {starting ? 'Starting…' : 'Start assessment'}
              </button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-wrap gap-2 border-b pb-4" aria-label="Question navigator">
                {assessment?.questions?.map((question: any, index: number) => <button key={question.id} type="button" onClick={() => setCurrentQuestion(index)} aria-current={currentQuestion === index ? 'step' : undefined} className={`h-9 w-9 rounded-full border text-xs font-bold ${currentQuestion === index ? 'border-blue-700 bg-blue-700 text-white' : answers[question.id] !== undefined && answers[question.id] !== '' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'}`}>{index + 1}</button>)}
              </div>
              <div className="space-y-4 text-xs">
                {assessment?.questions?.map((question: any, index: number) => {
                  let options: string[] = []; try { options = question.optionsJson ? JSON.parse(question.optionsJson) : [] } catch {}
                  if (question.questionType === 'TRUEFALSE' && options.length === 0) options = ['True', 'False']
                  if (index !== currentQuestion) return null
                  return <div key={question.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"><h4 className="font-bold text-slate-900 text-sm">Question {index + 1} of {assessment.questions.length}: {question.prompt}</h4>
                    {['MCQ','TRUEFALSE'].includes(question.questionType) ? <div className="space-y-1.5">{options.map((option) => <label key={option} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700"><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} /><span>{option}</span></label>)}</div>
                    : question.questionType === 'MULTISELECT' ? <div className="space-y-1.5">{options.map((option) => { const selected = Array.isArray(answers[question.id]) ? answers[question.id] : []; return <label key={option} className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.checked ? [...selected, option] : selected.filter((item: string) => item !== option) })}/>{option}</label> })}</div>
                    : question.questionType === 'FILE' ? <div><input aria-label={`Upload answer for question ${index + 1}`} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => void uploadAssessmentFile(question.id, event.target.files?.[0])}/>{answers[question.id] && <p className="mt-1 text-xs text-emerald-700">File attached.</p>}</div>
                    : question.questionType === 'NUMBER' ? <input type="number" value={answers[question.id] ?? ''} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} className="w-full rounded-xl border border-slate-300 p-3 text-xs" />
                    : <textarea rows={3} value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} placeholder="Type your response..." className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-none" />}
                  </div>
                })}
              </div>
              <div className="flex justify-between"><button type="button" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((value) => value - 1)} className="btn-secondary disabled:opacity-40">Previous</button><button type="button" disabled={currentQuestion >= (assessment?.questions?.length || 1) - 1} onClick={() => setCurrentQuestion((value) => value + 1)} className="btn-secondary disabled:opacity-40">Next</button></div>

              <div className="flex justify-end pt-4">
                <span role="status" className="mr-auto self-center text-xs text-slate-500">{saveStatus}</span>
                <button
                  onClick={() => setConfirmingSubmission(true)}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting…' : 'Review and submit'}
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {confirmingSubmission && <div role="dialog" aria-modal="true" aria-labelledby="submit-assessment-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="submit-assessment-title" className="text-lg font-bold">Submit your assessment?</h2><p className="mt-2 text-sm text-slate-600">{assessment.questions.filter((question: any) => answers[question.id] === undefined || answers[question.id] === '' || (Array.isArray(answers[question.id]) && !answers[question.id].length)).length} question(s) are unanswered. After submission, you cannot change your answers.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmingSubmission(false)} className="btn-secondary">Keep reviewing</button><button type="button" disabled={submitting} onClick={() => { setConfirmingSubmission(false); void handleSubmit(false) }} className="btn-primary">Submit assessment</button></div></div></div>}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
