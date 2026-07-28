'use client'

import { useState } from 'react'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

export default function ReportFraudPage() {
  const [incidentDetails, setIncidentDetails] = useState('')
  const [suspectContact, setSuspectContact] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/public/fraud-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspectContact, incidentDetails, reporterEmail }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'We could not submit the report.')
      setReference(data.reference)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not submit the report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-[300px_1fr]">
          <aside>
            <ShieldAlert className="h-7 w-7 text-rose-700" />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-rose-700">Recruitment fraud</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Asked to pay for a FRAD job?</h1>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Do not send money. FRAD does not charge candidates to apply, interview, take an assessment or receive an
              offer.
            </p>
            <div className="mt-6 border-t border-stone-300 pt-5 text-sm leading-6 text-stone-600">
              <p className="font-bold text-stone-900">Before you report</p>
              <p className="mt-2">
                Keep the message, email address, phone number, payment request and any screenshots. Do not continue
                engaging with the sender.
              </p>
            </div>
          </aside>

          <section className="section-panel p-5 sm:p-8">
            {reference ? (
              <div role="status" className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
                <h2 className="mt-4 text-2xl font-bold text-stone-950">Your report has been received.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  FRAD’s authorized investigation team can now review the information you provided. Keep this reference
                  for your records.
                </p>
                <p className="mx-auto mt-5 w-fit border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-sm font-bold">
                  {reference}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="suspect-contact" className="field-label">
                    How did the person contact you?
                  </label>
                  <input
                    id="suspect-contact"
                    required
                    value={suspectContact}
                    onChange={(event) => setSuspectContact(event.target.value)}
                    placeholder="Email address, phone number or social media account"
                    className="field-control"
                  />
                </div>
                <div>
                  <label htmlFor="reporter-email" className="field-label">
                    Your email <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="reporter-email"
                    type="email"
                    autoComplete="email"
                    value={reporterEmail}
                    onChange={(event) => setReporterEmail(event.target.value)}
                    className="field-control"
                  />
                  <p className="field-help">
                    Leave this blank if you do not want the investigation team to contact you.
                  </p>
                </div>
                <div>
                  <label htmlFor="incident-details" className="field-label">
                    What happened?
                  </label>
                  <textarea
                    id="incident-details"
                    required
                    minLength={20}
                    rows={8}
                    value={incidentDetails}
                    onChange={(event) => setIncidentDetails(event.target.value)}
                    placeholder="Tell us what was promised or requested, when it happened and whether any payment details were provided."
                    className="field-control"
                  />
                </div>
                {error && (
                  <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit fraud report'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
