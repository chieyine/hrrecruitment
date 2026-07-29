'use client'

import { use, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, LockKeyhole, Send } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

const ratingOptions = ['Exceptional', 'Strong', 'Satisfactory', 'Concern', 'Not observed']

export default function RefereePortalPage(props: { params: Promise<{ token: string }> }) {
  const { token } = use(props.params)
  const [linkState, setLinkState] = useState<'loading' | 'ready' | 'invalid'>('loading')
  const [linkError, setLinkError] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [position, setPosition] = useState('')
  const [refereeName, setRefereeName] = useState('')

  const [confirmDates, setConfirmDates] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [workQuality, setWorkQuality] = useState('')
  const [integrity, setIntegrity] = useState('')
  const [teamwork, setTeamwork] = useState('')
  const [management, setManagement] = useState('')
  const [reasonForLeaving, setReasonForLeaving] = useState('')
  const [strengths, setStrengths] = useState('')
  const [developmentAreas, setDevelopmentAreas] = useState('')
  const [rehire, setRehire] = useState('')
  const [safeguardingConcerns, setSafeguardingConcerns] = useState('')
  const [comments, setComments] = useState('')
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/public/reference/resolve?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'This reference link is not available.')
        setCandidateName(body.candidateName)
        setPosition(body.position)
        setRefereeName(body.refereeName)
        setLinkState('ready')
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setLinkError(cause instanceof Error ? cause.message : 'This reference link is not available.')
        setLinkState('invalid')
      })
    return () => controller.abort()
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/public/reference/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          answers: {
            refereeAuthorityConfirmed: authorityConfirmed,
            confirmDates,
            responsibilities,
            workQuality,
            integrity,
            teamwork,
            management,
            reasonForLeaving,
            strengths,
            developmentAreas,
            rehire,
            safeguardingConcerns,
          },
          confidentialComment: comments,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'We could not submit this reference.')
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not submit this reference.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">
          {linkState === 'loading' && (
            <section className="section-panel px-6 py-14 text-center" aria-live="polite">
              <p className="text-sm font-semibold text-stone-700">Checking this reference link…</p>
            </section>
          )}

          {linkState === 'invalid' && (
            <section className="section-panel px-6 py-14 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-700" />
              <h1 className="mt-4 text-2xl font-semibold text-navy-950">This reference link cannot be used</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">{linkError}</p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-500">
                Ask the candidate or FRAD recruitment team to send a new request if you still need to respond.
              </p>
            </section>
          )}

          {linkState === 'ready' && submitted && (
            <section className="section-panel px-6 py-14 text-center" role="status">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
              <h1 className="mt-4 text-2xl font-semibold text-navy-950">Reference received</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
                Thank you. The link is now closed and your response is available to the authorised recruitment team.
              </p>
            </section>
          )}

          {linkState === 'ready' && !submitted && (
            <>
              <header className="border-b border-stone-300 pb-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Reference request</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">
                      Reference for {candidateName}
                    </h1>
                    <p className="mt-3 text-sm text-stone-600">{position}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <LockKeyhole className="h-4 w-4 text-brand-700" />
                    Restricted to authorised recruitment staff
                  </div>
                </div>
              </header>

              <section className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-950">Your response</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      This request was sent to {refereeName}. Answer only what you can confirm from your own knowledge.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <fieldset className="space-y-5 px-5 py-6 sm:px-6">
                    <legend className="text-base font-semibold text-navy-950">Employment details</legend>
                    <TextArea
                      id="reference-dates"
                      label="Confirm the candidate’s job title and employment dates"
                      value={confirmDates}
                      onChange={setConfirmDates}
                      rows={3}
                      required
                    />
                    <TextArea
                      id="reference-responsibilities"
                      label="Main responsibilities"
                      value={responsibilities}
                      onChange={setResponsibilities}
                      rows={4}
                      required
                    />
                    <TextArea
                      id="reference-leaving"
                      label="Reason for leaving"
                      value={reasonForLeaving}
                      onChange={setReasonForLeaving}
                      rows={2}
                      required
                    />
                  </fieldset>

                  <fieldset className="border-t border-stone-200 px-5 py-6 sm:px-6">
                    <legend className="text-base font-semibold text-navy-950">Work assessment</legend>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <Rating label="Performance and reliability" value={workQuality} onChange={setWorkQuality} />
                      <Rating label="Integrity" value={integrity} onChange={setIntegrity} />
                      <Rating label="Teamwork" value={teamwork} onChange={setTeamwork} />
                      <Rating label="Management" value={management} onChange={setManagement} />
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <TextArea
                        id="reference-strengths"
                        label="Key strengths"
                        value={strengths}
                        onChange={setStrengths}
                        rows={3}
                        required
                      />
                      <TextArea
                        id="reference-development"
                        label="Development areas, if observed"
                        value={developmentAreas}
                        onChange={setDevelopmentAreas}
                        rows={3}
                      />
                    </div>
                  </fieldset>

                  <fieldset className="space-y-5 border-t border-stone-200 px-5 py-6 sm:px-6">
                    <legend className="text-base font-semibold text-navy-950">Overall reference</legend>
                    <SelectField
                      id="reference-rehire"
                      label="Would your organisation employ this person again?"
                      value={rehire}
                      onChange={setRehire}
                      options={[
                        ['Yes', 'Yes'],
                        ['No', 'No'],
                        ['Conditional', 'Only in some circumstances'],
                        ['Not known', 'I do not know'],
                      ]}
                    />
                    <TextArea
                      id="reference-safeguarding"
                      label="Known safeguarding, misconduct or disciplinary concerns"
                      help="Write “None known” only if that is accurate. Give relevant facts rather than assumptions."
                      value={safeguardingConcerns}
                      onChange={setSafeguardingConcerns}
                      rows={3}
                      required
                    />
                    <TextArea
                      id="reference-comments"
                      label="Additional comments"
                      help="Optional. Include only information relevant to this employment reference."
                      value={comments}
                      onChange={setComments}
                      rows={4}
                    />
                    <label className="flex items-start gap-3 border-t border-stone-200 pt-5 text-sm leading-6 text-stone-700">
                      <input
                        type="checkbox"
                        required
                        checked={authorityConfirmed}
                        onChange={(event) => setAuthorityConfirmed(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-700"
                      />
                      <span>
                        I confirm that I am {refereeName}, or I am authorised to respond on their behalf, and that this
                        information is accurate to the best of my knowledge.
                      </span>
                    </label>
                  </fieldset>

                  {error && (
                    <p role="alert" className="mx-5 mb-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-6">
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
                    <button type="submit" disabled={submitting} className="btn-primary">
                      <Send className="h-4 w-4" />
                      {submitting ? 'Submitting…' : 'Submit reference'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function TextArea({
  id,
  label,
  help,
  value,
  onChange,
  rows,
  required = false,
}: {
  id: string
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  rows: number
  required?: boolean
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="field-label">{label}</span>
      <textarea
        id={id}
        required={required}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      />
      {help && <span className="field-help block">{help}</span>}
    </label>
  )
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select required value={value} onChange={(event) => onChange(event.target.value)} className="field-control">
        <option value="">Choose an assessment</option>
        {ratingOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="field-label">{label}</span>
      <select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      >
        <option value="">Choose an answer</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
