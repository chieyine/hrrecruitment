'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Send } from 'lucide-react'

type Candidate = {
  id: string
  name: string
  vacancyId: string
  vacancyTitle: string
  vacancyReference: string
  fundedPositions: number
  screeningScore: number | null
  assessmentScore: number | null
  interviewScore: number | null
  weightedFinalScore: number | null
  rank: number | null
  scoreComplete: boolean
  recommendation: string | null
  decisionStatus: string | null
  internalStatus: string
  referenceStatus: string
}

function label(value: string | null) {
  return value ? value.replaceAll('_', ' ').toLowerCase() : 'Not recorded'
}

export default function SelectionWorkspace({ initialVacancyId = '' }: { initialVacancyId?: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedVacancyId, setSelectedVacancyId] = useState(initialVacancyId)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [outcome, setOutcome] = useState('SELECTED')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/recruitment/selections')
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Selection records are unavailable.')
      const records: Candidate[] = Array.isArray(body.candidates) ? body.candidates : []
      setCandidates(records)
      const vacancyId =
        (initialVacancyId && records.some((record) => record.vacancyId === initialVacancyId)
          ? initialVacancyId
          : selectedVacancyId && records.some((record) => record.vacancyId === selectedVacancyId)
            ? selectedVacancyId
            : records[0]?.vacancyId) || ''
      setSelectedVacancyId(vacancyId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Selection records are unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Load the workspace once; refresh is explicit after a submitted decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vacancies = useMemo(
    () =>
      [
        ...new Map(
          candidates.map((candidate) => [
            candidate.vacancyId,
            {
              id: candidate.vacancyId,
              title: candidate.vacancyTitle,
              reference: candidate.vacancyReference,
              fundedPositions: candidate.fundedPositions,
            },
          ])
        ).values(),
      ],
    [candidates]
  )

  const visibleCandidates = candidates.filter((candidate) => candidate.vacancyId === selectedVacancyId)
  const eligibleCandidates = visibleCandidates.filter(
    (candidate) =>
      candidate.scoreComplete &&
      ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK'].includes(candidate.internalStatus) &&
      !['PENDING', 'CONDITIONS_PENDING', 'APPROVED'].includes(candidate.decisionStatus || '')
  )

  useEffect(() => {
    if (!eligibleCandidates.some((candidate) => candidate.id === selectedAppId)) {
      setSelectedAppId(eligibleCandidates[0]?.id || '')
      setJustification('')
    }
  }, [selectedVacancyId, candidates, selectedAppId, eligibleCandidates])

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedAppId)
  const requiresOverride =
    outcome === 'SELECTED' &&
    Boolean(
      selectedCandidate?.rank &&
        selectedCandidate.fundedPositions &&
        selectedCandidate.rank > selectedCandidate.fundedPositions
    )
  const requiredReasonLength = requiresOverride ? 20 : 10

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/recruitment/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedAppId, outcome, justification }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The proposed selection could not be submitted.')
      setMessage('Proposed outcome sent to the independent approval queue.')
      setJustification('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The proposed selection could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="section-panel px-6 py-12 text-center text-sm font-medium text-stone-600">Loading selection records…</div>
  }

  if (error && !candidates.length) {
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
  }

  if (!vacancies.length) {
    return (
      <div className="empty-state">
        <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
        <p className="mt-3 text-sm font-semibold text-navy-950">No candidates are ready for selection.</p>
        <p className="mt-1 text-sm text-stone-500">Candidates appear after interview completion.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <p role={error ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error || message}
        </p>
      )}

      <label className="block max-w-xl">
        <span className="field-label">Vacancy</span>
        <select
          value={selectedVacancyId}
          onChange={(event) => {
            setSelectedVacancyId(event.target.value)
            setMessage('')
            window.history.replaceState(null, '', `/recruitment/selections?vacancy=${encodeURIComponent(event.target.value)}`)
          }}
          className="field-control"
        >
          {vacancies.map((vacancy) => (
            <option key={vacancy.id} value={vacancy.id}>
              {vacancy.reference} · {vacancy.title} · {vacancy.fundedPositions} {vacancy.fundedPositions === 1 ? 'position' : 'positions'}
            </option>
          ))}
        </select>
      </label>

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Recorded results</h2>
            <p className="mt-1 text-sm text-stone-600">
              Rank uses comparable recorded components. A missing component must be resolved before submission.
            </p>
          </div>
          <span className="text-sm text-stone-500">{visibleCandidates.length} candidates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Screening</th>
                <th>Assessment</th>
                <th>Interview</th>
                <th>Weighted score</th>
                <th>Decision record</th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="font-semibold text-navy-950">{candidate.rank ? `#${candidate.rank}` : '—'}</td>
                  <td>
                    <Link href={`/recruitment/applications/${candidate.id}`} className="font-semibold text-brand-700 hover:underline">
                      {candidate.name}
                    </Link>
                    {!candidate.scoreComplete && <span className="mt-1 block text-xs font-semibold text-amber-800">Incomplete score set</span>}
                  </td>
                  <td>{candidate.screeningScore ?? '—'}</td>
                  <td>{candidate.assessmentScore ?? '—'}</td>
                  <td>{candidate.interviewScore ?? '—'}</td>
                  <td className="font-semibold text-navy-950">{candidate.weightedFinalScore ?? '—'}</td>
                  <td>
                    {candidate.recommendation ? (
                      <>
                        <span className="block font-medium text-stone-800">{label(candidate.recommendation)}</span>
                        <span className="mt-1 block text-xs text-stone-500">{label(candidate.decisionStatus)}</span>
                      </>
                    ) : (
                      <span className="text-stone-500">Not submitted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-stone-200 bg-stone-50 px-5 py-3 text-xs leading-5 text-stone-600 sm:px-6">
          Standard weights are screening 20%, assessment 30% and interview 50%. If a component is not used for any
          candidate in this vacancy, the remaining weights are rebalanced.
        </p>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Propose an outcome</h2>
            <p className="mt-1 text-sm text-stone-600">
              Recruitment prepares the record. The assigned approvers make the decision in Approvals.
            </p>
          </div>
          <Link href="/recruitment/approvals" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Approval queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!eligibleCandidates.length ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-sm font-semibold text-navy-950">No outcome can be submitted for this vacancy.</p>
            <p className="mt-1 text-sm text-stone-500">Resolve incomplete scores or wait for the current approval.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="grid gap-5 px-5 py-6 sm:px-6 md:grid-cols-2">
              <label>
                <span className="field-label">Candidate</span>
                <select value={selectedAppId} onChange={(event) => { setSelectedAppId(event.target.value); setJustification('') }} className="field-control">
                  {eligibleCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · #{candidate.rank} · {candidate.weightedFinalScore ?? 'unscored'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Proposed outcome</span>
                <select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="field-control">
                  <option value="SELECTED">Selected</option>
                  <option value="FIRST_RESERVE">First reserve</option>
                  <option value="SECOND_RESERVE">Second reserve</option>
                  <option value="NOT_SELECTED">Not selected</option>
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="field-label">{requiresOverride ? 'Reason for ranking exception' : 'Reason for proposed outcome'}</span>
                {requiresOverride && (
                  <span className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    This candidate is ranked #{selectedCandidate?.rank} for {selectedCandidate?.fundedPositions} funded {selectedCandidate?.fundedPositions === 1 ? 'position' : 'positions'}.
                  </span>
                )}
                <textarea required minLength={requiredReasonLength} maxLength={5000} rows={4} value={justification} onChange={(event) => setJustification(event.target.value)} className="field-control" />
                <span className="field-help block">Refer to recorded evidence. Do not add new scoring criteria here.</span>
              </label>
            </div>
            <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
              <button disabled={submitting || !selectedAppId || justification.trim().length < requiredReasonLength} className="btn-primary">
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting…' : 'Send for approval'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
