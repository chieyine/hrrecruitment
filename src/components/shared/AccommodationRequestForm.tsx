'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccommodationRequestForm({ applications }: { applications: Array<{ id: string; vacancy: { title: string; referenceNumber: string } }> }) {
  const router = useRouter()
  const [applicationId, setApplicationId] = useState(applications[0]?.id || '')
  const [requestType, setRequestType] = useState('ASSESSMENT')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/candidate/accommodations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, requestType, details }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Your confidential request has been sent to the authorized HR team.' : data.error || 'Request failed')
    if (response.ok) { setDetails(''); router.refresh() }
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h2 className="font-bold text-slate-900">Request an adjustment</h2><p className="mt-1 text-xs text-slate-500">You do not need to disclose a diagnosis. Explain the practical adjustment that would let you participate fairly.</p></div>
      <label className="block text-xs font-bold text-slate-700">Application<select value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm">{applications.map((application) => <option key={application.id} value={application.id}>{application.vacancy.referenceNumber} · {application.vacancy.title}</option>)}</select></label>
      <label className="block text-xs font-bold text-slate-700">Adjustment area<select value={requestType} onChange={(event) => setRequestType(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm"><option value="ASSESSMENT">Assessment</option><option value="INTERVIEW">Interview</option><option value="COMMUNICATION">Communication</option><option value="ACCESSIBILITY">Accessibility</option><option value="OTHER">Other</option></select></label>
      <label className="block text-xs font-bold text-slate-700">What adjustment do you need?<textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={5} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
      {message && <p role="status" className="text-xs font-semibold text-blue-700">{message}</p>}
      <button disabled={!applicationId || details.trim().length < 10} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Send confidential request</button>
    </form>
  )
}
