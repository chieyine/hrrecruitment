'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

type Action = (payload: Record<string, unknown>) => Promise<void>

export default function ConfigurationBuilder({ mode }: { mode: 'scorecards' | 'packages' | 'courses' }) {
  const [data, setData] = useState<any>({ scorecards: [], packages: [], courses: [], forms: [], documents: [], policies: [], tasks: [] })
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/configuration-builder?mode=${mode}`)
    const body = await response.json()
    if (response.ok) setData(body)
    else setMessage(body.error || 'Could not load configuration.')
  }, [mode])
  useEffect(() => { void load() }, [load])
  const items = mode === 'scorecards' ? data.scorecards : mode === 'packages' ? data.packages : data.courses
  const current = useMemo(() => items.find((item: any) => item.id === selected), [items, selected])
  const act: Action = async (payload) => {
    setBusy(true)
    const response = await fetch('/api/admin/configuration-builder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await response.json()
    setMessage(response.ok ? 'Configuration updated.' : body.error || 'Update failed')
    setBusy(false)
    if (response.ok) await load()
  }

  return (
    <section className="mt-6 space-y-4 border border-blue-200 bg-blue-50/40 p-5">
      <div>
        <h2 className="font-bold">{mode === 'scorecards' ? 'Scorecard builder' : mode === 'packages' ? 'Preboarding package builder' : 'Course builder'}</h2>
        <p className="text-xs text-slate-600">Choose a record, then add or remove its structured content.</p>
      </div>
      <label className="block text-xs font-semibold text-slate-700">
        {mode === 'scorecards' ? 'Scorecard' : mode === 'packages' ? 'Package' : 'Course'}
        <select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1 w-full rounded border bg-white p-2 text-sm">
          <option value="">Select {mode === 'scorecards' ? 'scorecard' : mode === 'packages' ? 'package' : 'course'}</option>
          {items.map((item: any) => <option key={item.id} value={item.id}>{item.name || item.title}</option>)}
        </select>
      </label>
      {current && mode === 'scorecards' && <ScorecardEditor item={current} act={act} busy={busy} />}
      {current && mode === 'packages' && <PackageEditor item={current} data={data} act={act} busy={busy} />}
      {current && mode === 'courses' && <CourseEditor item={current} act={act} busy={busy} />}
      {message && <p role="status" className="text-xs font-bold text-slate-800">{message}</p>}
    </section>
  )
}

function ScorecardEditor({ item, act, busy }: { item: any; act: Action; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', maximumScore: '5', weight: '1', guidance: '' })
  async function submit() {
    await act({
      action: 'ADD_CRITERION',
      templateId: item.id,
      name: form.name,
      maximumScore: Number(form.maximumScore),
      weight: Number(form.weight),
      guidance: form.guidance,
      required: true,
      commentRequired: true,
    })
    setOpen(false)
    setForm({ name: '', maximumScore: '5', weight: '1', guidance: '' })
  }
  return (
    <div>
      <button onClick={() => setOpen(true)} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Add criterion</button>
      {item.criteria.map((criterion: any) => (
        <div key={criterion.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs">
          <span>{criterion.name} — max {criterion.maximumScore}, weight {criterion.weight}</span>
          <button disabled={busy} onClick={() => void act({ action: 'REMOVE_CRITERION', id: criterion.id })} className="font-bold text-rose-700 disabled:opacity-50">Remove</button>
        </div>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} title="Add scorecard criterion">
        <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="space-y-4">
          <label className="block text-xs font-semibold">Criterion name<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold">Maximum score<input required type="number" min="0.1" step="0.1" value={form.maximumScore} onChange={(event) => setForm({ ...form, maximumScore: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
            <label className="block text-xs font-semibold">Weight<input required type="number" min="0.1" step="0.1" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          </div>
          <label className="block text-xs font-semibold">Scoring guidance<textarea rows={4} maxLength={1000} value={form.guidance} onChange={(event) => setForm({ ...form, guidance: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add criterion</button></div>
        </form>
      </Dialog>
    </div>
  )
}

function CourseEditor({ item, act, busy }: { item: any; act: Action; busy: boolean }) {
  const [contentOpen, setContentOpen] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [content, setContent] = useState({ title: '', contentType: 'READING', content: '' })
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [question, setQuestion] = useState({ questionType: 'MCQ', question: '', options: '', correctAnswer: '', score: '1' })

  async function addContent() {
    let fileAssetId: string | undefined
    if (contentFile) {
      const form = new FormData()
      form.append('file', contentFile)
      form.append('sensitivityClass', 'INTERNAL')
      const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) return
      fileAssetId = body.fileAssetId
    }
    await act({ action: 'ADD_COURSE_CONTENT', courseId: item.id, ...content, fileAssetId })
    setContentOpen(false)
    setContent({ title: '', contentType: 'READING', content: '' })
    setContentFile(null)
  }
  async function addQuestion() {
    const type = question.questionType
    const options = type === 'SHORTTEXT' ? [] : type === 'TRUEFALSE' ? ['True', 'False'] : question.options.split('\n').map((value) => value.trim()).filter(Boolean)
    const correctAnswer = type === 'MULTISELECT'
      ? question.correctAnswer.split('\n').map((value) => value.trim()).filter(Boolean)
      : question.correctAnswer.trim()
    await act({ action: 'ADD_COURSE_QUESTION', courseId: item.id, questionType: type, question: question.question, options, correctAnswer, score: Number(question.score) })
    setQuestionOpen(false)
    setQuestion({ questionType: 'MCQ', question: '', options: '', correctAnswer: '', score: '1' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setContentOpen(true)} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Add content</button>
        <button onClick={() => setQuestionOpen(true)} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Add quiz question</button>
      </div>
      <div>
        <h3 className="text-sm font-bold">Content</h3>
        {item.contents?.length === 0 && <p className="mt-2 text-xs text-slate-500">No content added.</p>}
        {item.contents?.map((entry: any) => <div key={entry.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs"><span>{entry.contentType}: {entry.title}</span><button disabled={busy} onClick={() => void act({ action: 'REMOVE_COURSE_CONTENT', id: entry.id })} className="font-bold text-rose-700">Remove</button></div>)}
      </div>
      <div>
        <h3 className="text-sm font-bold">Quiz questions</h3>
        {item.quizQuestions?.length === 0 && <p className="mt-2 text-xs text-slate-500">No quiz questions added.</p>}
        {item.quizQuestions?.map((entry: any) => <div key={entry.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs"><span>{entry.questionType}: {entry.question}</span><button disabled={busy} onClick={() => void act({ action: 'REMOVE_COURSE_QUESTION', id: entry.id })} className="font-bold text-rose-700">Remove</button></div>)}
      </div>
      <div>
        <h3 className="text-sm font-bold">Candidate attempts</h3>
        {item.candidateCourses?.length ? item.candidateCourses.map((entry: any) => {
          const candidate = entry.candidatePreboarding.application.candidate
          return <div key={entry.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border bg-white p-2 text-xs"><span>{candidate.legalFirstName} {candidate.lastName} — {entry.status}, {entry.attempts} attempt(s), score {entry.score ?? '—'}</span><button onClick={() => setResetTarget(entry)} className="font-bold text-amber-700">Reset attempts</button></div>
        }) : <p className="mt-2 text-xs text-slate-500">No candidates assigned.</p>}
      </div>

      <Dialog open={contentOpen} onClose={() => setContentOpen(false)} title="Add course content">
        <form onSubmit={(event) => { event.preventDefault(); void addContent() }} className="space-y-4">
          <label className="block text-xs font-semibold">Title<input required minLength={2} value={content.title} onChange={(event) => setContent({ ...content, title: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <label className="block text-xs font-semibold">Content type<select value={content.contentType} onChange={(event) => setContent({ ...content, contentType: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm"><option>READING</option><option>VIDEO</option><option>SLIDES</option><option>ATTACHMENT</option></select></label>
          <label className="block text-xs font-semibold">Text, URL or asset reference<textarea rows={5} maxLength={10000} value={content.content} onChange={(event) => setContent({ ...content, content: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <label className="block text-xs font-semibold">Upload supporting file<input type="file" onChange={(event) => setContentFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setContentOpen(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add content</button></div>
        </form>
      </Dialog>

      <Dialog open={questionOpen} onClose={() => setQuestionOpen(false)} title="Add quiz question">
        <form onSubmit={(event) => { event.preventDefault(); void addQuestion() }} className="space-y-4">
          <label className="block text-xs font-semibold">Question type<select value={question.questionType} onChange={(event) => setQuestion({ ...question, questionType: event.target.value, options: '', correctAnswer: '' })} className="mt-1 w-full rounded border p-2.5 text-sm"><option value="MCQ">One correct answer</option><option value="MULTISELECT">Multiple correct answers</option><option value="TRUEFALSE">True or false</option><option value="SHORTTEXT">Short text</option></select></label>
          <label className="block text-xs font-semibold">Question<textarea required minLength={2} rows={3} value={question.question} onChange={(event) => setQuestion({ ...question, question: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          {!['TRUEFALSE', 'SHORTTEXT'].includes(question.questionType) && <label className="block text-xs font-semibold">Answer options, one per line<textarea required rows={4} value={question.options} onChange={(event) => setQuestion({ ...question, options: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>}
          <label className="block text-xs font-semibold">{question.questionType === 'MULTISELECT' ? 'Correct answers, one per line' : 'Correct answer'}<textarea required rows={question.questionType === 'MULTISELECT' ? 3 : 2} value={question.correctAnswer} onChange={(event) => setQuestion({ ...question, correctAnswer: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <label className="block text-xs font-semibold">Score<input required type="number" min="0.1" step="0.1" value={question.score} onChange={(event) => setQuestion({ ...question, score: event.target.value })} className="mt-1 w-full rounded border p-2.5 text-sm" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setQuestionOpen(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Add question</button></div>
        </form>
      </Dialog>

      <ReasonDialog open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} onConfirm={async (reason) => { await act({ action: 'RESET_COURSE_ATTEMPT', candidateCourseId: resetTarget.id, reason }); setResetTarget(null) }} title="Reset course attempts" description="This removes previous attempts and returns the course to its assigned state." confirmLabel="Reset attempts" reasonLabel="Reason for reset" reasonRequired tone="danger" busy={busy} />
    </div>
  )
}

function PackageEditor({ item, data, act, busy }: { item: any; data: any; act: Action; busy: boolean }) {
  const [type, setType] = useState('FORM')
  const resources = type === 'FORM' ? data.forms : type === 'DOCUMENT' ? data.documents : type === 'POLICY' ? data.policies : type === 'COURSE' ? data.courses : data.tasks
  const [resourceId, setResourceId] = useState('')
  const [dueOffsetDays, setDueOffsetDays] = useState('7')
  const [timing, setTiming] = useState('BEFORE_RESUMPTION')
  const groups = [['FORM', item.packageForms, 'formTemplate'], ['DOCUMENT', item.packageDocuments, 'documentRequirement'], ['POLICY', item.packagePolicies, 'policyDocument'], ['COURSE', item.packageCourses, 'course'], ['TASK', item.packageTasks, 'taskTemplate']] as const
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold">Item type<select value={type} onChange={(event) => { setType(event.target.value); setResourceId('') }} className="mt-1 block rounded border bg-white p-2 text-xs"><option>FORM</option><option>DOCUMENT</option><option>POLICY</option><option>COURSE</option><option>TASK</option></select></label>
        <label className="text-xs font-semibold">Resource<select value={resourceId} onChange={(event) => setResourceId(event.target.value)} className="mt-1 block min-w-56 rounded border bg-white p-2 text-xs"><option value="">Select resource</option>{resources.map((resource: any) => <option key={resource.id} value={resource.id}>{resource.title || resource.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Due after days<input type="number" min="0" max="365" value={dueOffsetDays} onChange={(event) => setDueOffsetDays(event.target.value)} className="mt-1 block w-28 rounded border bg-white p-2 text-xs" /></label>
        {type === 'COURSE' && <label className="text-xs font-semibold">Required by<select value={timing} onChange={(event) => setTiming(event.target.value)} className="mt-1 block rounded border bg-white p-2 text-xs"><option value="BEFORE_RESUMPTION">Before resumption</option><option value="FIRST_WEEK">First week</option><option value="FIRST_MONTH">First month</option><option value="OPTIONAL">Optional</option></select></label>}
        <button disabled={!resourceId || busy} onClick={() => void act({ action: 'ADD_PACKAGE_ITEM', packageId: item.id, itemType: type, resourceId, required: true, dueOffsetDays: Number(dueOffsetDays), ...(type === 'COURSE' ? { timing } : {}) })} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Add required item</button>
      </div>
      {groups.flatMap(([itemType, entries, relation]) => entries.map((entry: any) => <div key={entry.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs"><span>{itemType}: {entry[relation]?.title || entry[relation]?.name}{itemType === 'COURSE' ? ` — ${String(entry.timing).replaceAll('_', ' ').toLowerCase()}` : ''}</span><button disabled={busy} onClick={() => void act({ action: 'REMOVE_PACKAGE_ITEM', itemType, id: entry.id })} className="font-bold text-rose-700">Remove</button></div>))}
    </div>
  )
}
