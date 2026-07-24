'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { Award, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SelectionRankingPage() {
  const [candidates, setCandidates] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/recruitment/selections')
      .then(async (res) => {
        const json = await res.json()
        if (res.ok && Array.isArray(json.candidates)) {
          setCandidates(json.candidates)
          if (json.candidates[0]) setSelectedAppId(json.candidates[0].id)
        }
      })
      .catch(console.error)
  }, [])

  const [selectedAppId, setSelectedAppId] = useState('')
  const [outcome, setOutcome] = useState('SELECTED')
  const [overrideFlag, setOverrideFlag] = useState(false)
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

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
          rank: 1,
          justification,
          overrideFlag,
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {msg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
              Selection & Ranking Workspace
            </span>
            <h1 className="text-3xl font-extrabold">Final Candidate Weighted Ranking</h1>
            <p className="text-xs text-slate-300">
              Screening, assessment and panel scores are normalised to percentages before the configured 20/30/50 weighting is applied.
            </p>
          </div>

          {/* Ranking Table */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
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
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-blue-600 text-sm">#{c.rank}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.name}
                        <span className="block text-[10px] text-slate-500 font-normal">{c.email}</span>
                      </td>
                      <td className="py-3.5 px-4">{c.screeningScore ?? '—'}%</td>
                      <td className="py-3.5 px-4">{c.assessmentScore}%</td>
                      <td className="py-3.5 px-4">{c.interviewScore}%</td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-700 text-sm">
                        {c.weightedFinalScore ?? '—'}{c.weightedFinalScore == null ? '' : '%'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                          {c.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selection Approval Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Record Final Selection Approval
            </h2>

            <form onSubmit={handleApproveSelection} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Candidate</label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (#{c.rank} - {c.weightedFinalScore}%)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selection Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="SELECTED">Selected Candidate (Rank #1)</option>
                    <option value="FIRST_RESERVE">First Reserve Candidate</option>
                    <option value="SECOND_RESERVE">Second Reserve Candidate</option>
                  </select>
                </div>
              </div>

              {/* Ranking Override Option */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideFlag}
                    onChange={(e) => setOverrideFlag(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600"
                  />
                  <span>Ranking Override Exception Request</span>
                </label>

                {overrideFlag && (
                  <div className="space-y-1.5 pt-2">
                    <label className="block font-bold text-amber-900">Mandatory Written Justification</label>
                    <textarea
                      required={overrideFlag}
                      rows={3}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Specify objective grounds for selecting a non-highest ranked candidate..."
                      className="w-full rounded-xl border border-amber-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Recording Decision...' : 'Approve Candidate Selection'}
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
