'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccommodationRequestForm({
  applications,
}: {
  applications: Array<{ id: string; vacancy: { title: string; referenceNumber: string } }>
}) {
  const router = useRouter()
  const [applicationId, setApplicationId] = useState(applications[0]?.id || '')
  const [requestType, setRequestType] = useState('ASSESSMENT')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/candidate/accommodations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, requestType, details }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'The request could not be sent.')
        return
      }
      setMessage('Request sent. HR will reply on this page.')
      setDetails('')
      router.refresh()
    } catch {
      setError('The request could not be sent. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-navy-900">What would help?</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Describe the change you need. You do not have to share a diagnosis or medical history.
        </p>
      </div>
      <label className="field-label">
        Application
        <select
          value={applicationId}
          onChange={(event) => setApplicationId(event.target.value)}
          className="field-control mt-1.5"
        >
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.vacancy.referenceNumber} · {application.vacancy.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        What is the adjustment for?
        <select
          value={requestType}
          onChange={(event) => setRequestType(event.target.value)}
          className="field-control mt-1.5"
        >
          <option value="ASSESSMENT">Assessment</option>
          <option value="INTERVIEW">Interview</option>
          <option value="COMMUNICATION">Communication</option>
          <option value="ACCESSIBILITY">Accessibility</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <label className="field-label">
        Tell us what you need
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={5}
          className="field-control mt-1.5 resize-y"
          placeholder="For example: I need extra time for the written assessment."
        />
        <span className="field-help">Include any timing or access details that will help us arrange it.</span>
      </label>
      {message && (
        <p role="status" className="text-xs font-semibold text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      <button disabled={busy || !applicationId || details.trim().length < 10} className="btn-primary">
        {busy ? 'Sending…' : 'Send request'}
      </button>
    </form>
  )
}
