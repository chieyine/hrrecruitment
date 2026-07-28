'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReferenceManager({ applications }: { applications: Array<{ id: string; name: string }> }) {
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
  const [message, setMessage] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
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
        permissionToContact: true,
        manualOutcome: manualOutcome || undefined,
        manualComment: manualComment || undefined,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Failed')
      return
    }
    if (manualOutcome) {
      setMessage('Manual reference outcome recorded with verification evidence.')
      router.refresh()
      return
    }
    if (contactStatus !== 'READY') {
      setMessage(
        contactStatus === 'WAIVED' ? 'Reference waiver recorded.' : 'Unable-to-contact status recorded for follow-up.'
      )
      router.refresh()
      return
    }
    const send = await fetch(`/api/recruitment/referees/${data.referee.id}/send-request`, { method: 'POST' })
    const sent = await send.json()
    setMessage(send.ok ? 'Referee added and secure request sent.' : sent.error || 'Referee added but sending failed.')
    router.refresh()
  }
  return (
    <form onSubmit={submit} className="rounded-2xl border bg-white p-5 space-y-3">
      <div>
        <h2 className="font-bold">Add reference check</h2>
        <p className="text-xs text-slate-500">
          Send a secure single-use request, or record a verified offline/manual result.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          required
          value={applicationId}
          onChange={(event) => setApplicationId(event.target.value)}
          className="rounded border p-2 text-sm"
        >
          <option value="">Candidate</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.name}
            </option>
          ))}
        </select>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Referee name"
          className="rounded border p-2 text-sm"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="rounded border p-2 text-sm"
        />
        <input
          required
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          placeholder="Organization"
          className="rounded border p-2 text-sm"
        />
        <input
          required
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          placeholder="Position"
          className="rounded border p-2 text-sm"
        />
        <input
          required
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
          placeholder="Relationship"
          className="rounded border p-2 text-sm"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone (optional)"
          className="rounded border p-2 text-sm"
        />
        <select
          value={preferredContactMethod}
          onChange={(event) => setPreferredContactMethod(event.target.value)}
          className="rounded border p-2 text-sm"
        >
          <option value="EMAIL">Contact by email</option>
          <option value="PHONE">Contact by phone</option>
        </select>
        <select
          value={contactStatus}
          onChange={(event) => setContactStatus(event.target.value)}
          className="rounded border p-2 text-sm"
        >
          <option value="READY">Ready to contact</option>
          <option value="UNABLE_TO_CONTACT">Unable to contact</option>
          <option value="WAIVED">Waived by HR manager</option>
        </select>
        <input
          value={periodKnown}
          onChange={(event) => setPeriodKnown(event.target.value)}
          placeholder="Period known (optional)"
          className="rounded border p-2 text-sm"
        />
        <select
          value={manualOutcome}
          onChange={(event) => setManualOutcome(event.target.value)}
          className="rounded border p-2 text-sm"
        >
          <option value="">Send online request</option>
          <option value="SATISFACTORY">Manual: satisfactory</option>
          <option value="SATISFACTORY_WITH_CONCERNS">Manual: satisfactory with concerns</option>
          <option value="UNSATISFACTORY">Manual: unsatisfactory</option>
        </select>
      </div>
      {manualOutcome && (
        <textarea
          required
          value={manualComment}
          onChange={(event) => setManualComment(event.target.value)}
          placeholder="Verification method, evidence, and reviewer notes"
          className="w-full rounded border p-2 text-sm"
        />
      )}
      {contactStatus === 'WAIVED' && (
        <textarea
          required
          minLength={10}
          value={waiverReason}
          onChange={(event) => setWaiverReason(event.target.value)}
          placeholder="Approved reason for waiving this reference"
          className="w-full rounded border p-2 text-sm"
        />
      )}
      <button className="rounded bg-brand-600 px-4 py-2 text-xs font-bold text-white">
        {manualOutcome
          ? 'Record verified outcome'
          : contactStatus === 'READY' && preferredContactMethod === 'EMAIL'
            ? 'Add and send secure request'
            : 'Record reference status'}
      </button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </form>
  )
}

export function ReferenceActions({ id, hasActive }: { id: string; hasActive: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const act = async (action: string) => {
    const response = await fetch(`/api/recruitment/referees/${id}/${action}`, { method: 'POST' })
    const data = await response.json()
    setMessage(response.ok ? 'Sent.' : data.error || 'Failed')
    if (response.ok) router.refresh()
  }
  return (
    <div className="flex gap-2">
      {hasActive ? (
        <button
          onClick={() => act('send-reminder')}
          className="rounded bg-amber-600 px-2 py-1 text-xs font-bold text-white"
        >
          Remind
        </button>
      ) : (
        <button
          onClick={() => act('send-request')}
          className="rounded bg-brand-600 px-2 py-1 text-xs font-bold text-white"
        >
          Send
        </button>
      )}
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  )
}

export function VerifyReferenceResponse({ responseId }: { responseId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const verify = async () => {
    const response = await fetch(`/api/recruitment/reference-responses/${responseId}/verify`, { method: 'POST' })
    const body = await response.json()
    setMessage(response.ok ? 'Verified.' : body.error || 'Verification failed.')
    if (response.ok) router.refresh()
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={verify}
        className="rounded border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-800"
      >
        Verify response
      </button>
      {message && (
        <span role="status" className="text-xs text-slate-500">
          {message}
        </span>
      )}
    </span>
  )
}
