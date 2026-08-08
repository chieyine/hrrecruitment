'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BankQuestion = {
  id: string
  title: string
  category: string
  difficulty: string
  jobFamily: string | null
  questionType: string
  prompt: string
  maximumScore: number
  accessLevel: string
  status: string
  version: number
  reviewDueAt: Date | string | null
  expiresAt: Date | string | null
  createdBy: string
}

export default function AssessmentBankManager({ questions, assessments, currentUserId }: {
  questions: BankQuestion[]
  assessments: Array<{ id: string; title: string; vacancy: { referenceNumber: string } }>
  currentUserId: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [assessmentByQuestion, setAssessmentByQuestion] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ title: '', category: '', difficulty: 'MEDIUM', jobFamily: '', questionType: 'MCQ', prompt: '', options: '', correctAnswer: '', maximumScore: 10, accessLevel: 'RESTRICTED', reviewDueAt: '', expiresAt: '' })
  const submit = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/recruitment/assessment-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json()
    setMessage(response.ok ? 'Question bank updated.' : data.error || 'The change could not be saved.')
    if (response.ok) router.refresh()
  }
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.8fr)]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Controlled questions</h2>
        <div className="mt-5 space-y-4">
          {questions.length === 0 && <p className="text-sm text-stone-600">No questions have been added yet.</p>}
          {questions.map((question) => (
            <article key={question.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-950">{question.title}</h3>
                  <p className="mt-1 text-xs text-stone-500">{question.category} · {question.difficulty} · version {question.version} · {question.status}</p>
                </div>
                {question.status === 'DRAFT' && question.createdBy !== currentUserId && (
                  <button className="btn-secondary" onClick={() => submit({ action: 'APPROVE', questionId: question.id })}>Approve</button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">{question.prompt}</p>
              <p className="mt-2 text-xs text-stone-500">{question.questionType} · {question.maximumScore} marks · {question.accessLevel}{question.jobFamily ? ` · ${question.jobFamily}` : ''}</p>
              {question.status === 'ACTIVE' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <select className="field-control min-w-56" value={assessmentByQuestion[question.id] || ''} onChange={(event) => setAssessmentByQuestion((current) => ({ ...current, [question.id]: event.target.value }))}>
                    <option value="">Choose an assessment</option>
                    {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.vacancy.referenceNumber} — {assessment.title}</option>)}
                  </select>
                  <button className="btn-secondary" disabled={!assessmentByQuestion[question.id]} onClick={() => submit({ action: 'COPY_TO_ASSESSMENT', questionId: question.id, assessmentId: assessmentByQuestion[question.id] })}>Use question</button>
                  <button className="btn-secondary" onClick={() => submit({ action: 'RETIRE', questionId: question.id, reason: 'Retired from the controlled question bank' })}>Retire</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <form className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); submit({ action: 'CREATE', ...form, options: form.options.split('\n').map((item) => item.trim()).filter(Boolean), correctAnswer: form.questionType === 'MULTISELECT' ? form.correctAnswer.split('|').map((item) => item.trim()).filter(Boolean) : form.correctAnswer || undefined, reviewDueAt: form.reviewDueAt || undefined, expiresAt: form.expiresAt || undefined, jobFamily: form.jobFamily || undefined }) }}>
        <h2 className="text-lg font-semibold text-stone-950">Add a draft question</h2>
        <p className="mt-1 text-sm text-stone-600">Another assessor must approve it before it can be used.</p>
        <div className="mt-5 space-y-4">
          <label className="field-label">Title<input className="field-control mt-1" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">Category<input className="field-control mt-1" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label className="field-label">Difficulty<select className="field-control mt-1" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></label>
          </div>
          <label className="field-label">Job family<input className="field-control mt-1" value={form.jobFamily} onChange={(e) => setForm({ ...form, jobFamily: e.target.value })} /></label>
          <label className="field-label">Question type<select className="field-control mt-1" value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })}><option>MCQ</option><option>MULTISELECT</option><option>TRUEFALSE</option><option>SHORTTEXT</option><option>LONGTEXT</option><option>NUMBER</option><option>FILE</option></select></label>
          <label className="field-label">Question<textarea className="field-control mt-1" required rows={5} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} /></label>
          <label className="field-label">Options, one per line<textarea className="field-control mt-1" rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} /></label>
          <label className="field-label">Correct answer<input className="field-control mt-1" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">Maximum score<input className="field-control mt-1" type="number" min="1" value={form.maximumScore} onChange={(e) => setForm({ ...form, maximumScore: Number(e.target.value) })} /></label>
            <label className="field-label">Access<select className="field-control mt-1" value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}><option value="RESTRICTED">Restricted</option><option value="HR">HR team</option><option value="ASSESSOR">Assessors</option></select></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">Review due<input className="field-control mt-1" type="date" value={form.reviewDueAt} onChange={(e) => setForm({ ...form, reviewDueAt: e.target.value })} /></label>
            <label className="field-label">Expires<input className="field-control mt-1" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
          </div>
          <button className="btn-primary w-full">Save draft</button>
          {message && <p role="status" className="text-sm text-stone-700">{message}</p>}
        </div>
      </form>
    </div>
  )
}
