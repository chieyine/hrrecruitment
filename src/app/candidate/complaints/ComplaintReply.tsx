'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ComplaintReply({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/complaints/${caseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The reply could not be sent.')
      setBody('')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The reply could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-stone-200 px-5 py-4 sm:px-6">
      <label htmlFor={`case-reply-${caseId}`} className="field-label">
        Reply to this case
      </label>
      <textarea
        id={`case-reply-${caseId}`}
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="field-control mt-2"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || body.trim().length < 2} className="btn-primary mt-3">
        {busy ? 'Sending…' : 'Send reply'}
      </button>
    </form>
  )
}
