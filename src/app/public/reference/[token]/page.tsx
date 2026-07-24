'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { CheckCircle2, AlertCircle, Send } from 'lucide-react'

export default async function RefereePortalPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const [candidateName, setCandidateName] = useState('the candidate')
  const [position, setPosition] = useState('the advertised position')
  const [invalidLink, setInvalidLink] = useState('')

  useEffect(() => {
    fetch(`/api/public/reference/resolve?token=${encodeURIComponent(params.token)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Invalid reference link')
        setCandidateName(json.candidateName)
        setPosition(json.position)
      })
      .catch((e) => setInvalidLink(e.message))
  }, [params.token])

  const [confirmDates, setConfirmDates] = useState('Yes, confirmed')
  const [workQuality, setWorkQuality] = useState('Excellent')
  const [rehire, setRehire] = useState('Yes')
  const [safeguardingConcerns, setSafeguardingConcerns] = useState('None')
  const [responsibilities, setResponsibilities] = useState('')
  const [integrity, setIntegrity] = useState('Strong')
  const [teamwork, setTeamwork] = useState('Strong')
  const [management, setManagement] = useState('Not observed')
  const [reasonForLeaving, setReasonForLeaving] = useState('')
  const [strengths, setStrengths] = useState('')
  const [developmentAreas, setDevelopmentAreas] = useState('')
  const [outcome, setOutcome] = useState('SATISFACTORY')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/public/reference/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          answers: { confirmDates, responsibilities, workQuality, integrity, teamwork, management, reasonForLeaving, strengths, developmentAreas, rehire, safeguardingConcerns },
          outcome,
          confidentialComment: comments,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Failed to submit reference. The link may be expired.')
      }
    } catch {
      setError('An error occurred while submitting your reference.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
              Confidential Referee Verification Portal
            </span>
            <h1 className="text-2xl font-extrabold">Professional Reference Request</h1>
            <p className="text-xs text-slate-300">
              FRAD Human Resources verification for <strong>{candidateName}</strong> applying for <strong>{position}</strong>.
              {invalidLink && (
                <span role="alert" className="mt-2 block rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-700">
                  {invalidLink}
                </span>
              )}
            </p>
          </div>

          {submitted ? (
            <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm text-center space-y-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h2 className="text-2xl font-extrabold text-slate-900">Thank you. Your reference has been received.</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Thank you for providing your professional evaluation. Your response has been securely logged with FRAD Human Resources.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    1. Confirm Employment Dates & Role
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmDates}
                    onChange={(e) => setConfirmDates(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    2. Quality of Performance & Reliability
                  </label>
                  <select
                    value={workQuality}
                    onChange={(e) => setWorkQuality(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Exceptional">Exceptional</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>

                <label className="block font-bold text-slate-900">Main responsibilities held by the candidate
                  <textarea required rows={3} value={responsibilities} onChange={(event) => setResponsibilities(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal" />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="font-bold text-slate-900">Integrity<select value={integrity} onChange={(event) => setIntegrity(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal"><option>Exceptional</option><option>Strong</option><option>Satisfactory</option><option>Concern</option><option>Not observed</option></select></label>
                  <label className="font-bold text-slate-900">Teamwork<select value={teamwork} onChange={(event) => setTeamwork(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal"><option>Exceptional</option><option>Strong</option><option>Satisfactory</option><option>Concern</option><option>Not observed</option></select></label>
                  <label className="font-bold text-slate-900">Management<select value={management} onChange={(event) => setManagement(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal"><option>Exceptional</option><option>Strong</option><option>Satisfactory</option><option>Concern</option><option>Not observed</option></select></label>
                </div>
                <label className="block font-bold text-slate-900">Reason for leaving
                  <textarea required rows={2} value={reasonForLeaving} onChange={(event) => setReasonForLeaving(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="font-bold text-slate-900">Key strengths<textarea required rows={3} value={strengths} onChange={(event) => setStrengths(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal" /></label>
                  <label className="font-bold text-slate-900">Development areas<textarea required rows={3} value={developmentAreas} onChange={(event) => setDevelopmentAreas(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal" /></label>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    3. Eligibility for Re-employment
                  </label>
                  <select
                    value={rehire}
                    onChange={(e) => setRehire(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Yes">Yes, eligible for rehire</option>
                    <option value="No">No, not eligible</option>
                    <option value="Conditional">Conditional</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    4. Safeguarding, Misconduct, or Disciplinary Concerns
                  </label>
                  <input
                    type="text"
                    required
                    value={safeguardingConcerns}
                    onChange={(e) => setSafeguardingConcerns(e.target.value)}
                    placeholder="State any concerns or write 'None'"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    5. Overall Reference Recommendation
                  </label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-600 focus:outline-none font-bold"
                  >
                    <option value="SATISFACTORY">Satisfactory - Highly Recommended</option>
                    <option value="SATISFACTORY_WITH_CONCERNS">Satisfactory with Concerns</option>
                    <option value="UNSATISFACTORY">Unsatisfactory - Not Recommended</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Confidential Comments</label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide additional details regarding integrity, leadership, or technical skill..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all w-full"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Confidential Reference'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
