'use client'
import { useEffect, useMemo, useState } from 'react'

type Answer = string | number | boolean | string[]

type Question = {
  id: string
  fieldType: string
  label: string
  helpText?: string | null
  required: boolean
  configurationJson?: string | null
  conditionJson?: string | null
}

type Vacancy = {
  id: string
  referenceNumber: string
  title: string
  questions: Question[]
  requiredDocuments: Array<{ id: string; documentType: string; required: boolean }>
}

type AssistedData = {
  candidates: Array<{ id: string; name: string; email: string }>
  vacancies: Vacancy[]
}

function optionsFor(question: Question) {
  if (!question.configurationJson) return []
  try {
    const parsed = JSON.parse(question.configurationJson)
    const values = Array.isArray(parsed) ? parsed : parsed.options
    return Array.isArray(values) ? values.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function isVisible(question: Question, questions: Question[], answers: Record<string, Answer>) {
  if (!question.conditionJson) return true
  try {
    const condition = JSON.parse(question.conditionJson) as {
      dependsOnIndex: number
      operator: string
      value: unknown
    }
    const dependency = questions[condition.dependsOnIndex]
    if (!dependency) return false
    const actual = answers[dependency.id]
    if (condition.operator === 'CONTAINS')
      return Array.isArray(actual)
        ? actual.map(String).includes(String(condition.value))
        : String(actual ?? '').includes(String(condition.value))
    if (condition.operator === 'NOT_EQUALS') return String(actual ?? '') !== String(condition.value)
    return String(actual ?? '') === String(condition.value)
  } catch {
    return false
  }
}

export default function AssistedApplicationEntry() {
  const [data, setData] = useState<AssistedData | null>(null)
  const [candidateId, setCandidateId] = useState('')
  const [vacancyId, setVacancyId] = useState('')
  const [reason, setReason] = useState('')
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/recruitment/applications/assisted')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || 'Assisted entry is unavailable.')
        setData(body)
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Assisted entry is unavailable.'))
      .finally(() => setLoading(false))
  }, [])

  const vacancy = useMemo(() => data?.vacancies.find((record) => record.id === vacancyId), [data, vacancyId])
  const visibleQuestions = useMemo(
    () => vacancy?.questions.filter((question) => isVisible(question, vacancy.questions, answers)) || [],
    [answers, vacancy]
  )
  const hasFileQuestion = vacancy?.questions.some((question) => question.fieldType === 'FILE') || false
  const requiredDocuments = vacancy?.requiredDocuments.filter((document) => document.required) || []

  if (loading) return <p className="mb-6 text-sm text-stone-600">Loading assisted entry…</p>
  if (!data)
    return (
      <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {message}
      </p>
    )

  const setAnswer = (questionId: string, answer: Answer) =>
    setAnswers((current) => ({ ...current, [questionId]: answer }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/api/recruitment/applications/assisted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          vacancyId,
          reason,
          answers: Object.entries(answers).map(([vacancyQuestionId, answer]) => ({
            vacancyQuestionId,
            answer,
          })),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The application could not be recorded.')
      setMessage('Application recorded. The candidate has been notified.')
      setCandidateId('')
      setVacancyId('')
      setReason('')
      setAnswers({})
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The application could not be recorded.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <details className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-stone-900">
        Help a candidate submit
      </summary>
      <p className="border-t border-stone-100 px-5 pt-4 text-sm leading-6 text-stone-600">
        Use this when a registered candidate cannot use the online form. Read each answer back to the candidate and
        record how they gave permission.
      </p>
      <form onSubmit={submit} className="space-y-5 p-5 pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-stone-800">
            Candidate
            <select
              required
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Choose a registered candidate</option>
              {data.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} — {candidate.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-800">
            Vacancy
            <select
              required
              value={vacancyId}
              onChange={(event) => {
                setVacancyId(event.target.value)
                setAnswers({})
                setMessage('')
              }}
              className="mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Choose an open vacancy</option>
              {data.vacancies.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.referenceNumber} — {record.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {requiredDocuments.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Confirm that HR has received: {requiredDocuments.map((document) => document.documentType).join(', ')}. These
            files are not attached by this form and will be recorded for follow-up.
          </div>
        )}

        {hasFileQuestion && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            This vacancy asks for a file inside the application form. The candidate must submit through their account so
            the file can be checked and attached correctly.
          </div>
        )}

        {!hasFileQuestion &&
          visibleQuestions.map((question) => {
            const options = optionsFor(question)
            const value = answers[question.id]
            const label = (
              <>
                {question.label}
                {question.required ? ' *' : ''}
              </>
            )
            const fieldClass =
              'mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900'

            if (question.fieldType === 'DECLARATION')
              return (
                <label key={question.id} className="flex gap-3 rounded-lg border border-stone-200 p-4 text-sm">
                  <input
                    type="checkbox"
                    required={question.required}
                    checked={value === true}
                    onChange={(event) => setAnswer(question.id, event.target.checked)}
                    className="mt-0.5 size-4"
                  />
                  <span>
                    <span className="font-medium text-stone-900">{label}</span>
                    {question.helpText && <span className="mt-1 block text-stone-600">{question.helpText}</span>}
                  </span>
                </label>
              )

            if (question.fieldType === 'MULTISELECT')
              return (
                <fieldset key={question.id} className="rounded-lg border border-stone-200 p-4">
                  <legend className="px-1 text-sm font-medium text-stone-900">{label}</legend>
                  {question.helpText && <p className="mb-3 text-sm text-stone-600">{question.helpText}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((option) => {
                      const selected = Array.isArray(value) ? value : []
                      return (
                        <label key={option} className="flex items-center gap-2 text-sm text-stone-800">
                          <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={(event) =>
                              setAnswer(
                                question.id,
                                event.target.checked
                                  ? [...selected, option]
                                  : selected.filter((item) => item !== option)
                              )
                            }
                          />
                          {option}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )

            return (
              <label key={question.id} className="block text-sm font-medium text-stone-800">
                {label}
                {question.fieldType === 'LONGTEXT' ? (
                  <textarea
                    required={question.required}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                    rows={5}
                    className={fieldClass}
                  />
                ) : question.fieldType === 'YESNO' ? (
                  <select
                    required={question.required}
                    value={typeof value === 'boolean' ? String(value) : ''}
                    onChange={(event) => setAnswer(question.id, event.target.value === 'true')}
                    className={fieldClass}
                  >
                    <option value="">Choose an answer</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : question.fieldType === 'SELECT' ? (
                  <select
                    required={question.required}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Choose an answer</option>
                    {options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={question.required}
                    type={question.fieldType === 'NUMBER' ? 'number' : question.fieldType === 'DATE' ? 'date' : 'text'}
                    value={typeof value === 'string' || typeof value === 'number' ? value : ''}
                    onChange={(event) =>
                      setAnswer(
                        question.id,
                        question.fieldType === 'NUMBER' ? event.target.valueAsNumber : event.target.value
                      )
                    }
                    className={fieldClass}
                  />
                )}
                {question.helpText && (
                  <span className="mt-1.5 block font-normal text-stone-600">{question.helpText}</span>
                )}
              </label>
            )
          })}

        <label className="block text-sm font-medium text-stone-800">
          Why was assisted entry needed, and how did the candidate give permission? *
          <textarea
            required
            minLength={10}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-2 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          disabled={submitting || hasFileQuestion}
          className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Recording…' : 'Record application'}
        </button>
        {message && (
          <p role="status" className="text-sm font-medium text-stone-800">
            {message}
          </p>
        )}
      </form>
    </details>
  )
}
