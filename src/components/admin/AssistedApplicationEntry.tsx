'use client'
import { useEffect, useMemo, useState } from 'react'

export default function AssistedApplicationEntry() {
  const [data, setData] = useState<any | null>(null)
  const [candidateId, setCandidateId] = useState('')
  const [vacancyId, setVacancyId] = useState('')
  const [reason, setReason] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  useEffect(() => {
    fetch('/api/recruitment/applications/assisted').then(async (response) =>
      response.ok ? setData(await response.json()) : null
    )
  }, [])
  const vacancy = useMemo(() => data?.vacancies?.find((record: any) => record.id === vacancyId), [data, vacancyId])
  if (!data) return null
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/recruitment/applications/assisted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        vacancyId,
        reason,
        answers: Object.entries(answers).map(([vacancyQuestionId, answer]) => ({ vacancyQuestionId, answer })),
      }),
    })
    const body = await response.json()
    setMessage(response.ok ? 'Assisted application recorded and candidate notified.' : body.error || 'Failed')
  }
  return (
    <details className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <summary className="cursor-pointer text-sm font-bold text-amber-900">
        Exceptional HR-assisted application entry
      </summary>
      <p className="mt-2 text-xs text-amber-800">
        Use only when a registered candidate cannot submit because of an accessibility or connectivity barrier. Every
        entry is audited.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="grid gap-2 md:grid-cols-2">
          <select
            required
            value={candidateId}
            onChange={(event) => setCandidateId(event.target.value)}
            className="rounded border p-2 text-xs"
          >
            <option value="">Registered candidate</option>
            {data.candidates.map((candidate: any) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {candidate.email}
              </option>
            ))}
          </select>
          <select
            required
            value={vacancyId}
            onChange={(event) => {
              setVacancyId(event.target.value)
              setAnswers({})
            }}
            className="rounded border p-2 text-xs"
          >
            <option value="">Open vacancy</option>
            {data.vacancies.map((record: any) => (
              <option key={record.id} value={record.id}>
                {record.referenceNumber} — {record.title}
              </option>
            ))}
          </select>
        </div>
        {vacancy?.questions?.map((question: any) => (
          <label key={question.id} className="block text-xs font-bold">
            {question.label}
            {question.required ? ' *' : ''}
            <input
              required={question.required}
              value={answers[question.id] || ''}
              onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
        ))}
        <textarea
          required
          minLength={10}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Accessibility/connectivity reason and candidate authorization evidence"
          className="w-full rounded border p-2 text-xs"
        />
        <button className="rounded bg-amber-800 px-3 py-2 text-xs font-bold text-white">
          Record assisted application
        </button>
        {message && (
          <p role="status" className="text-xs font-bold">
            {message}
          </p>
        )}
      </form>
    </details>
  )
}
