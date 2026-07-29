'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

type Action = (payload: Record<string, unknown>) => Promise<void>

export default function ConfigurationBuilder({ mode }: { mode: 'scorecards' | 'packages' | 'courses' }) {
  const [data, setData] = useState<any>({
    scorecards: [],
    packages: [],
    courses: [],
    forms: [],
    documents: [],
    policies: [],
    tasks: [],
  })
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/configuration-builder?mode=${mode}`)
    const body = await response.json()
    if (response.ok) setData(body)
    else setMessage(body.error || 'Could not load configuration.')
  }, [mode])
  useEffect(() => {
    void load()
  }, [load])
  const items = mode === 'scorecards' ? data.scorecards : mode === 'packages' ? data.packages : data.courses
  const current = useMemo(() => items.find((item: any) => item.id === selected), [items, selected])
  const act: Action = async (payload) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/configuration-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The configuration could not be updated.')
      setMessage('Configuration updated.')
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The configuration could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-panel mt-6 space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-bold">
          {mode === 'scorecards'
            ? 'Scorecard builder'
            : mode === 'packages'
              ? 'Preboarding package builder'
              : 'Course builder'}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {mode === 'courses'
            ? 'Choose a course to manage its learning material and assessment.'
            : mode === 'scorecards'
              ? 'Choose a scorecard to manage its criteria.'
              : 'Choose a package to manage its candidate requirements.'}
        </p>
      </div>
      <label className="block text-xs font-semibold text-slate-700">
        {mode === 'scorecards' ? 'Scorecard' : mode === 'packages' ? 'Package' : 'Course'}
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="mt-1 w-full rounded border bg-white p-2 text-sm"
        >
          <option value="">
            Select {mode === 'scorecards' ? 'scorecard' : mode === 'packages' ? 'package' : 'course'}
          </option>
          {items.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name || item.title}
            </option>
          ))}
        </select>
      </label>
      {current && mode === 'scorecards' && <ScorecardEditor item={current} act={act} busy={busy} />}
      {current && mode === 'packages' && <PackageEditor item={current} data={data} act={act} busy={busy} />}
      {current && mode === 'courses' && (
        <CourseEditor item={current} act={act} busy={busy} report={setMessage} />
      )}
      {message && (
        <p role="status" className="text-xs font-bold text-slate-800">
          {message}
        </p>
      )}
    </section>
  )
}

function ScorecardEditor({ item, act, busy }: { item: any; act: Action; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', maximumScore: '10', guidance: '' })
  const totalPoints = item.criteria.reduce(
    (sum: number, criterion: any) => sum + Number(criterion.maximumScore || 0),
    0
  )
  const isScreening = item.scorecardType === 'SCREENING'
  async function submit() {
    await act({
      action: 'ADD_CRITERION',
      templateId: item.id,
      name: form.name,
      maximumScore: Number(form.maximumScore),
      weight: 1,
      guidance: form.guidance,
      required: true,
      commentRequired: true,
    })
    setOpen(false)
    setForm({ name: '', maximumScore: '10', guidance: '' })
  }
  return (
    <div className="space-y-4 border-t border-stone-200 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-navy-950">{item.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                item.active ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {item.active ? 'In use' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {item.criteria.length} {item.criteria.length === 1 ? 'criterion' : 'criteria'} · {totalPoints} points
            {isScreening ? ' of 100' : ''}
          </p>
        </div>
        <button
          type="button"
          disabled={item.active}
          onClick={() => setOpen(true)}
          className="btn-primary min-h-0 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add criterion
        </button>
      </div>

      {item.active && (
        <p className="border-l-2 border-brand-600 bg-brand-50 px-4 py-3 text-xs leading-5 text-brand-900">
          This scorecard is available to vacancies. Create a copy before changing its criteria.
        </p>
      )}
      {!item.active && isScreening && (
        <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-label={`${totalPoints} of 100 points`}>
          <div className="h-full bg-brand-700 transition-all" style={{ width: `${Math.min(totalPoints, 100)}%` }} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {item.criteria.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-stone-500">
            No criteria yet. Add the evidence reviewers must assess.
          </p>
        ) : (
          item.criteria.map((criterion: any, index: number) => (
            <div
              key={criterion.id}
              className={`grid gap-3 px-4 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_6rem_auto] sm:items-start ${
                index ? 'border-t border-stone-200' : ''
              }`}
            >
              <span className="text-xs font-semibold text-stone-400">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-sm font-semibold text-navy-950">{criterion.name}</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">{criterion.guidance}</p>
                {criterion.commentRequired && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Reviewer comment required
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold text-navy-950">{criterion.maximumScore} points</p>
              {!item.active && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act({ action: 'REMOVE_CRITERION', id: criterion.id })}
                  className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add scorecard criterion">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-semibold">
            Criterion name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <div>
            <label className="block text-xs font-semibold">
              Points available
              <input
                required
                type="number"
                min="1"
                max={isScreening ? Math.max(1, 100 - totalPoints) : 100}
                step="1"
                value={form.maximumScore}
                onChange={(event) => setForm({ ...form, maximumScore: event.target.value })}
                className="mt-1 w-full rounded border p-2.5 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold">
            What reviewers should look for
            <textarea
              required
              minLength={10}
              rows={4}
              maxLength={1000}
              value={form.guidance}
              onChange={(event) => setForm({ ...form, guidance: event.target.value })}
              placeholder="Describe what a strong, acceptable and weak response looks like."
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm">
              Cancel
            </button>
            <button disabled={busy} className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
              Add criterion
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function CourseEditor({
  item,
  act,
  busy,
  report,
}: {
  item: any
  act: Action
  busy: boolean
  report: (message: string) => void
}) {
  const [contentOpen, setContentOpen] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [content, setContent] = useState({ title: '', contentType: 'READING', content: '' })
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [question, setQuestion] = useState({
    questionType: 'MCQ',
    question: '',
    options: '',
    correctAnswer: '',
    score: '1',
  })

  async function addContent() {
    let fileAssetId: string | undefined
    if (contentFile) {
      const form = new FormData()
      form.append('file', contentFile)
      form.append('sensitivityClass', 'STANDARD')
      const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        report(error.error || 'The course file could not be uploaded.')
        return
      }
      fileAssetId = body.fileAssetId
    }
    await act({ action: 'ADD_COURSE_CONTENT', courseId: item.id, ...content, fileAssetId })
    setContentOpen(false)
    setContent({ title: '', contentType: 'READING', content: '' })
    setContentFile(null)
  }
  async function addQuestion() {
    const type = question.questionType
    const options =
      type === 'SHORTTEXT'
        ? []
        : type === 'TRUEFALSE'
          ? ['True', 'False']
          : question.options
              .split('\n')
              .map((value) => value.trim())
              .filter(Boolean)
    const correctAnswer =
      type === 'MULTISELECT'
        ? question.correctAnswer
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean)
        : question.correctAnswer.trim()
    await act({
      action: 'ADD_COURSE_QUESTION',
      courseId: item.id,
      questionType: type,
      question: question.question,
      options,
      correctAnswer,
      score: Number(question.score),
    })
    setQuestionOpen(false)
    setQuestion({ questionType: 'MCQ', question: '', options: '', correctAnswer: '', score: '1' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setContentOpen(true)}
          className="rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white"
        >
          Add content
        </button>
        <button
          onClick={() => setQuestionOpen(true)}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
        >
          Add quiz question
        </button>
      </div>
      <div>
        <h3 className="text-sm font-bold">Content</h3>
        {item.contents?.length === 0 && <p className="mt-2 text-xs text-slate-500">No content added.</p>}
        {item.contents?.map((entry: any) => (
          <div key={entry.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs">
            <span>
              {entry.contentType}: {entry.title}
            </span>
            <button
              disabled={busy}
              onClick={() => void act({ action: 'REMOVE_COURSE_CONTENT', id: entry.id })}
              className="font-bold text-rose-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-bold">Quiz questions</h3>
        {item.quizQuestions?.length === 0 && <p className="mt-2 text-xs text-slate-500">No quiz questions added.</p>}
        {item.quizQuestions?.map((entry: any) => (
          <div key={entry.id} className="mt-2 flex justify-between gap-3 border bg-white p-2 text-xs">
            <span>
              {entry.questionType}: {entry.question}
            </span>
            <button
              disabled={busy}
              onClick={() => void act({ action: 'REMOVE_COURSE_QUESTION', id: entry.id })}
              className="font-bold text-rose-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <details className="border-t border-stone-200 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-navy-950">
          Candidate attempts ({item.candidateCourses?.length || 0})
        </summary>
        <div className="mt-3">
        {item.candidateCourses?.length ? (
          item.candidateCourses.map((entry: any) => {
            const candidate = entry.candidatePreboarding.application.candidate
            return (
              <div
                key={entry.id}
                className="mt-2 flex flex-wrap items-center justify-between gap-2 border bg-white p-2 text-xs"
              >
                <span>
                  {candidate.legalFirstName} {candidate.lastName} — {entry.status}, {entry.attempts} attempt(s), score{' '}
                  {entry.score ?? '—'}
                </span>
                <button onClick={() => setResetTarget(entry)} className="font-bold text-amber-700">
                  Reset attempts
                </button>
              </div>
            )
          })
        ) : (
          <p className="mt-2 text-xs text-slate-500">No candidates assigned.</p>
        )}
        </div>
      </details>

      <Dialog open={contentOpen} onClose={() => setContentOpen(false)} title="Add course content">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void addContent()
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-semibold">
            Title
            <input
              required
              minLength={2}
              value={content.title}
              onChange={(event) => setContent({ ...content, title: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold">
            Content type
            <select
              value={content.contentType}
              onChange={(event) => setContent({ ...content, contentType: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            >
              <option>READING</option>
              <option>VIDEO</option>
              <option>SLIDES</option>
              <option>ATTACHMENT</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Text, URL or asset reference
            <textarea
              rows={5}
              maxLength={10000}
              value={content.content}
              onChange={(event) => setContent({ ...content, content: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold">
            Upload supporting file
            <input
              type="file"
              onChange={(event) => setContentFile(event.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setContentOpen(false)} className="rounded border px-4 py-2 text-sm">
              Cancel
            </button>
            <button disabled={busy} className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
              Add content
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={questionOpen} onClose={() => setQuestionOpen(false)} title="Add quiz question">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void addQuestion()
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-semibold">
            Question type
            <select
              value={question.questionType}
              onChange={(event) =>
                setQuestion({ ...question, questionType: event.target.value, options: '', correctAnswer: '' })
              }
              className="mt-1 w-full rounded border p-2.5 text-sm"
            >
              <option value="MCQ">One correct answer</option>
              <option value="MULTISELECT">Multiple correct answers</option>
              <option value="TRUEFALSE">True or false</option>
              <option value="SHORTTEXT">Short text</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Question
            <textarea
              required
              minLength={2}
              rows={3}
              value={question.question}
              onChange={(event) => setQuestion({ ...question, question: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          {!['TRUEFALSE', 'SHORTTEXT'].includes(question.questionType) && (
            <label className="block text-xs font-semibold">
              Answer options, one per line
              <textarea
                required
                rows={4}
                value={question.options}
                onChange={(event) => setQuestion({ ...question, options: event.target.value })}
                className="mt-1 w-full rounded border p-2.5 text-sm"
              />
            </label>
          )}
          <label className="block text-xs font-semibold">
            {question.questionType === 'MULTISELECT' ? 'Correct answers, one per line' : 'Correct answer'}
            <textarea
              required
              rows={question.questionType === 'MULTISELECT' ? 3 : 2}
              value={question.correctAnswer}
              onChange={(event) => setQuestion({ ...question, correctAnswer: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold">
            Score
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={question.score}
              onChange={(event) => setQuestion({ ...question, score: event.target.value })}
              className="mt-1 w-full rounded border p-2.5 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setQuestionOpen(false)} className="rounded border px-4 py-2 text-sm">
              Cancel
            </button>
            <button disabled={busy} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
              Add question
            </button>
          </div>
        </form>
      </Dialog>

      <ReasonDialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        onConfirm={async (reason) => {
          await act({ action: 'RESET_COURSE_ATTEMPT', candidateCourseId: resetTarget.id, reason })
          setResetTarget(null)
        }}
        title="Reset course attempts"
        description="This removes previous attempts and returns the course to its assigned state."
        confirmLabel="Reset attempts"
        reasonLabel="Reason for reset"
        reasonRequired
        tone="danger"
        busy={busy}
      />
    </div>
  )
}

function PackageEditor({ item, data, act, busy }: { item: any; data: any; act: Action; busy: boolean }) {
  const [type, setType] = useState('FORM')
  const resources =
    type === 'FORM'
      ? data.forms
      : type === 'DOCUMENT'
        ? data.documents
        : type === 'POLICY'
          ? data.policies
          : type === 'COURSE'
            ? data.courses
            : data.tasks
  const [resourceId, setResourceId] = useState('')
  const [dueOffsetDays, setDueOffsetDays] = useState('7')
  const [timing, setTiming] = useState('BEFORE_RESUMPTION')
  const [required, setRequired] = useState(true)
  const groups = [
    ['FORM', item.packageForms, 'formTemplate'],
    ['DOCUMENT', item.packageDocuments, 'documentRequirement'],
    ['POLICY', item.packagePolicies, 'policyDocument'],
    ['COURSE', item.packageCourses, 'course'],
    ['TASK', item.packageTasks, 'taskTemplate'],
  ] as const
  const configuredIds = new Set(
    groups.flatMap(([, entries, relation]) => entries.map((entry: any) => entry[relation]?.id))
  )
  const availableResources = resources.filter((resource: any) => !configuredIds.has(resource.id))
  return (
    <div className="space-y-5">
      {item.active ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          This package is published. Create a copy before changing its requirements so existing vacancy and candidate
          records remain stable.
        </div>
      ) : (
      <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-[150px_minmax(220px,1fr)_140px_150px_auto] lg:items-end">
        <label className="text-xs font-semibold text-stone-700">
          Item type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setResourceId('')
            }}
            className="field-control"
          >
            <option value="FORM">Form</option>
            <option value="DOCUMENT">Document</option>
            <option value="POLICY">Policy</option>
            <option value="COURSE">Course</option>
            <option value="TASK">Task</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">
          Requirement
          <select
            value={resourceId}
            onChange={(event) => setResourceId(event.target.value)}
            className="field-control"
          >
            <option value="">Select requirement</option>
            {availableResources.map((resource: any) => (
              <option key={resource.id} value={resource.id}>
                {resource.title || resource.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">
          Due after assignment
          <input
            type="number"
            min="0"
            max="365"
            value={dueOffsetDays}
            onChange={(event) => setDueOffsetDays(event.target.value)}
            className="field-control"
          />
          <span className="mt-1 block text-[10px] font-normal text-stone-500">days</span>
        </label>
        {type === 'COURSE' && (
          <label className="text-xs font-semibold text-stone-700">
            Completion
            <select
              value={timing}
              onChange={(event) => setTiming(event.target.value)}
              className="field-control"
            >
              <option value="BEFORE_RESUMPTION">Before resumption</option>
              <option value="OPTIONAL">Optional</option>
            </select>
          </label>
        )}
        {type !== 'COURSE' && (
          <label className="mb-2 flex min-h-10 items-center gap-2 text-sm font-medium text-stone-700">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="h-4 w-4 rounded border-stone-300" />
            Required
          </label>
        )}
        <button
          disabled={!resourceId || busy}
          onClick={() =>
            void act({
              action: 'ADD_PACKAGE_ITEM',
              packageId: item.id,
              itemType: type,
              resourceId,
              required: type === 'COURSE' ? timing !== 'OPTIONAL' : required,
              dueOffsetDays: Number(dueOffsetDays),
              ...(type === 'COURSE' ? { timing } : {}),
            })
          }
          className="btn-primary min-h-10 px-3 py-2 disabled:opacity-50"
        >
          Add to package
        </button>
      </div>
      )}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="grid grid-cols-[110px_1fr_120px_auto] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
          <span>Type</span><span>Requirement</span><span>Due</span><span />
        </div>
      {groups.flatMap(([itemType, entries, relation]) =>
        entries.map((entry: any) => (
          <div key={entry.id} className="grid grid-cols-[110px_1fr_120px_auto] gap-3 border-b border-stone-100 px-4 py-3 text-sm last:border-b-0">
            <span className="text-xs font-semibold text-stone-500">{itemType.toLowerCase()}</span>
            <span className="font-medium text-navy-950">
              {entry[relation]?.title || entry[relation]?.name}
              {!entry.required && <span className="ml-2 text-xs font-normal text-stone-500">Optional</span>}
              {itemType === 'COURSE' && ['FIRST_WEEK', 'FIRST_MONTH'].includes(entry.timing) && (
                <span className="ml-2 text-xs font-normal text-amber-700">Legacy {String(entry.timing).replaceAll('_', ' ').toLowerCase()}</span>
              )}
            </span>
            <span className="text-xs text-stone-600">{entry.dueOffsetDays} days</span>
            {!item.active && <button
              disabled={busy}
              onClick={() => void act({ action: 'REMOVE_PACKAGE_ITEM', itemType, id: entry.id })}
              className="text-xs font-semibold text-rose-700"
            >
              Remove
            </button>}
          </div>
        ))
      )}
      {groups.every(([, entries]) => entries.length === 0) && (
        <p className="px-4 py-8 text-center text-sm text-stone-500">No requirements have been added.</p>
      )}
      </div>
    </div>
  )
}
