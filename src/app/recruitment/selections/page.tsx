'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { Award, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageIntro } from '@/components/ui/PageElements'

export default function SelectionRankingPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedVacancyId, setSelectedVacancyId] = useState('')
  const [selectedAppId, setSelectedAppId] = useState('')
  const [outcome, setOutcome] = useState('SELECTED')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/recruitment/selections')
      .then(async (res) => {
        const json = await res.json()
        if (res.ok && Array.isArray(json.candidates)) {
          setCandidates(json.candidates)
          if (json.candidates[0]) {
            setSelectedVacancyId(json.candidates[0].vacancyId)
            setSelectedAppId(json.candidates[0].id)
          }
        }
      })
      .catch(console.error)
  }, [])

  const vacancies = [
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
  ]
  const visibleCandidates = candidates.filter((candidate) => candidate.vacancyId === selectedVacancyId)
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedAppId)
  const requiresOverrideJustification =
    outcome === 'SELECTED' && Boolean(selectedCandidate && selectedCandidate.rank > selectedCandidate.fundedPositions)

  const handleApproveSelection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/recruitment/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId,
          outcome,
          justification: justification.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (res.ok) {
        setMsg(
          json.status === 'APPROVED'
            ? 'Selection decision recorded and approved. Candidate ready for offer generation.'
            : 'Selection decision recorded and submitted for approval by an approver-level role.'
        )
      } else {
        setMsg(json.error || 'Failed to record selection decision.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />

      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          {msg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}

          <PageIntro
            eyebrow="Selection"
            title="Final candidate ranking"
            description="Compare screening, assessment and interview results using the approved weighting for the vacancy."
          />

          {/* Ranking Table */}
          <div className="section-panel space-y-6 p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Candidate Weighted Score Matrix
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Screening (20%)</th>
                    <th className="py-3 px-4">Assessment (30%)</th>
                    <th className="py-3 px-4">Interview (50%)</th>
                    <th className="py-3 px-4">Weighted Score</th>
                    <th className="py-3 px-4 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {visibleCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-brand-600 text-sm">#{c.rank}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.name}
                        <span className="block text-[10px] text-slate-500 font-normal">{c.email}</span>
                      </td>
                      <td className="py-3.5 px-4">{c.screeningScore ?? '—'}%</td>
                      <td className="py-3.5 px-4">{c.assessmentScore}%</td>
                      <td className="py-3.5 px-4">{c.interviewScore}%</td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-700 text-sm">
                        {c.weightedFinalScore ?? '—'}
                        {c.weightedFinalScore == null ? '' : '%'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                          {c.recommendation?.replaceAll('_', ' ') || 'No decision'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selection Approval Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Record Final Selection Approval
            </h2>

            <form onSubmit={handleApproveSelection} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vacancy</label>
                  <select
                    value={selectedVacancyId}
                    onChange={(event) => {
                      const vacancyId = event.target.value
                      setSelectedVacancyId(vacancyId)
                      setSelectedAppId(candidates.find((candidate) => candidate.vacancyId === vacancyId)?.id ?? '')
                      setJustification('')
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-brand-600 focus:outline-none"
                  >
                    {vacancies.map((vacancy) => (
                      <option key={vacancy.id} value={vacancy.id}>
                        {vacancy.reference} — {vacancy.title} ({vacancy.fundedPositions} position
                        {vacancy.fundedPositions === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Candidate</label>
                  <select
                    value={selectedAppId}
                    onChange={(event) => {
                      setSelectedAppId(event.target.value)
                      setJustification('')
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-brand-600 focus:outline-none"
                  >
                    {visibleCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} (#{candidate.rank} · {candidate.weightedFinalScore ?? 'unscored'}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selection outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-brand-600 focus:outline-none"
                  >
                    <option value="SELECTED">Selected</option>
                    <option value="FIRST_RESERVE">First reserve</option>
                    <option value="SECOND_RESERVE">Second reserve</option>
                    <option value="NOT_SELECTED">Not selected</option>
                  </select>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 space-y-2 ${requiresOverrideJustification ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <p className={`font-bold ${requiresOverrideJustification ? 'text-amber-950' : 'text-slate-800'}`}>
                  {requiresOverrideJustification
                    ? `Ranking override: this candidate is ranked #${selectedCandidate?.rank} for ${selectedCandidate?.fundedPositions} funded position${selectedCandidate?.fundedPositions === 1 ? '' : 's'}.`
                    : 'Decision rationale'}
                </p>
                <p className="text-slate-600">
                  Rank and override status are calculated by the server. They cannot be set in this form.
                </p>
                <label className="block font-bold text-slate-800">
                  {requiresOverrideJustification
                    ? 'Mandatory written justification (at least 20 characters)'
                    : 'Justification (optional)'}
                  <textarea
                    required={requiresOverrideJustification}
                    minLength={requiresOverrideJustification ? 20 : undefined}
                    rows={3}
                    value={justification}
                    onChange={(event) => setJustification(event.target.value)}
                    placeholder="Record the objective evidence supporting this decision."
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-brand-600 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={
                    submitting || !selectedAppId || (requiresOverrideJustification && justification.trim().length < 20)
                  }
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting decision...' : 'Submit selection for approval'}
                  <Award className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
