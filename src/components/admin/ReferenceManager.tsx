'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Mail, Phone } from 'lucide-react'

export default function ReferenceManager({
  applications,
  canWaive,
}: {
  applications: Array<{ id: string; name: string }>
  canWaive: boolean
}) {
  const router = useRouter()
  const [applicationId, setApplicationId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [position, setPosition] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('')
  const [periodKnown, setPeriodKnown] = useState('')
  const [preferredContactMethod, setPreferredContactMethod] = useState('EMAIL')
  const [contactStatus, setContactStatus] = useState('READY')
  const [waiverReason, setWaiverReason] = useState('')
  const [manualOutcome, setManualOutcome] = useState('')
  const [manualComment, setManualComment] = useState('')
  const [permissionToContact, setPermissionToContact] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}/referees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          organization,
          position,
          relationship,
          phone: phone || undefined,
          preferredContactMethod,
          contactStatus,
          waiverReason: waiverReason || undefined,
          periodKnown: periodKnown || undefined,
          permissionToContact,
          manualOutcome: manualOutcome || undefined,
          manualComment: manualComment || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The reference could not be added.')
      if (manualOutcome) {
        setMessage('Verified offline reference recorded.')
        router.refresh()
        return
      }
      if (contactStatus !== 'READY') {
        setMessage(contactStatus === 'WAIVED' ? 'Waiver recorded.' : 'Contact problem recorded.')
        router.refresh()
        return
      }
      if (preferredContactMethod === 'PHONE') {
        setMessage('Referee added. Record the call as an offline reference after speaking with them.')
        router.refresh()
        return
      }
      const send = await fetch(`/api/recruitment/referees/${data.referee.id}/send-request`, { method: 'POST' })
      const sent = await send.json()
      if (!send.ok) throw new Error(sent.error || 'The referee was added, but the email could not be queued.')
      setMessage('Secure request queued for delivery.')
      router.refresh()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The reference could not be added.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <form onSubmit={submit} className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-950">Start a reference check</h2>
          <p className="mt-1 text-sm text-stone-600">
            Add the referee named by the candidate, then send a secure form or record a completed call.
          </p>
        </div>
      </div>
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">Candidate and vacancy</span>
            <select required value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="field-control">
              <option value="">Choose a candidate</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>{application.name}</option>
              ))}
            </select>
          </label>
          <Field label="Referee name" value={name} onChange={setName} required />
          <Field label="Organisation" value={organization} onChange={setOrganization} required />
          <Field label="Job title" value={position} onChange={setPosition} required />
          <Field label="Relationship to candidate" value={relationship} onChange={setRelationship} required />
          <Field label="Period known" value={periodKnown} onChange={setPeriodKnown} />
          <Field label="Email address" value={email} onChange={setEmail} type="email" required />
          <Field label="Telephone number" value={phone} onChange={setPhone} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">How the reference will be collected</span>
            <select value={preferredContactMethod} onChange={(event) => setPreferredContactMethod(event.target.value)} className="field-control">
              <option value="EMAIL">Secure online form</option>
              <option value="PHONE">Telephone call</option>
            </select>
          </label>
          <label>
            <span className="field-label">Record type</span>
            <select value={manualOutcome} onChange={(event) => setManualOutcome(event.target.value)} className="field-control">
              <option value="">New request</option>
              <option value="SATISFACTORY">Completed offline — satisfactory</option>
              <option value="SATISFACTORY_WITH_CONCERNS">Completed offline — concerns noted</option>
              <option value="UNSATISFACTORY">Completed offline — unsatisfactory</option>
            </select>
          </label>
        </div>

        {manualOutcome && (
          <label>
            <span className="field-label">Verification record</span>
            <textarea required minLength={10} value={manualComment} onChange={(event) => setManualComment(event.target.value)} className="field-control" rows={4} />
            <span className="field-help block">State who supplied the reference, how their identity was checked, and the evidence for the outcome.</span>
          </label>
        )}

        {!manualOutcome && (
          <label>
            <span className="field-label">Contact status</span>
            <select value={contactStatus} onChange={(event) => setContactStatus(event.target.value)} className="field-control">
              <option value="READY">Ready to contact</option>
              <option value="UNABLE_TO_CONTACT">Unable to contact</option>
              {canWaive && <option value="WAIVED">Waive this reference</option>}
            </select>
          </label>
        )}

        {contactStatus === 'WAIVED' && !manualOutcome && (
          <label>
            <span className="field-label">Reason for waiver</span>
            <textarea required minLength={10} value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} className="field-control" rows={3} />
          </label>
        )}

        <label className="flex items-start gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
          <input type="checkbox" required checked={permissionToContact} onChange={(event) => setPermissionToContact(event.target.checked)} className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-700" />
          <span>I have checked that the candidate authorised FRAD to contact this referee.</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
        <p role="status" className="text-sm text-stone-600">{message}</p>
        <button disabled={submitting} className="btn-primary">
          {preferredContactMethod === 'PHONE' ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {submitting ? 'Saving…' : manualOutcome ? 'Record completed reference' : preferredContactMethod === 'EMAIL' ? 'Add and send request' : 'Add referee'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      />
    </label>
  )
}

export function ReferenceActions({ id, hasActive }: { id: string; hasActive: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const act = async (action: string) => {
    setWorking(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/referees/${id}/${action}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The request could not be sent.')
      setMessage(action === 'send-reminder' ? 'Reminder queued.' : 'Request queued.')
      router.refresh()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The request could not be sent.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={working} onClick={() => act(hasActive ? 'send-reminder' : 'send-request')} className="btn-secondary text-xs">
        <Mail className="h-3.5 w-3.5" />
        {working ? 'Queuing…' : hasActive ? 'Send reminder' : 'Send request'}
      </button>
      {message && <span role="status" className="text-xs text-stone-600">{message}</span>}
    </div>
  )
}

export function VerifyReferenceResponse({ responseId }: { responseId: string }) {
  const router = useRouter()
  const [outcome, setOutcome] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const verify = async () => {
    setWorking(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/reference-responses/${responseId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, reviewNote }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The review could not be saved.')
      setMessage('Review completed.')
      router.refresh()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The review could not be saved.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="field-label">FRAD assessment</span>
          <select required value={outcome} onChange={(event) => setOutcome(event.target.value)} className="field-control">
            <option value="">Choose an outcome</option>
            <option value="SATISFACTORY">Satisfactory</option>
            <option value="SATISFACTORY_WITH_CONCERNS">Satisfactory with concerns</option>
            <option value="UNSATISFACTORY">Unsatisfactory</option>
          </select>
        </label>
        <label>
          <span className="field-label">Review note</span>
          <textarea required minLength={10} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="field-control" rows={3} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={working || !outcome || reviewNote.trim().length < 10} onClick={verify} className="btn-primary text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {working ? 'Saving…' : 'Complete review'}
        </button>
        {message && <span role="status" className="text-xs text-stone-600">{message}</span>}
      </div>
    </div>
  )
}
