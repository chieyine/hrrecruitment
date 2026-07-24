'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InterviewResponse({ id, current }: { id: string; current: string | null }) {
  const router = useRouter()
  const [rescheduling, setRescheduling] = useState(false)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const respond = async (response: 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'DECLINED') => {
    if (response === 'RESCHEDULE_REQUESTED' && !comment.trim()) {
      setMessage('Tell us why you need another time.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const result = await fetch(`/api/candidate/interviews/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, comment: response === 'RESCHEDULE_REQUESTED' ? comment.trim() : '' }),
      })
      const body = await result.json()
      if (!result.ok) {
        setMessage(body.error || 'We could not save your response.')
        return
      }
      setMessage('Response saved.')
      setRescheduling(false)
      setComment('')
      router.refresh()
    } catch {
      setMessage('We could not save your response. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void respond('CONFIRMED')} className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          Confirm
        </button>
        <button type="button" disabled={busy} onClick={() => setRescheduling(true)} className="rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 disabled:opacity-50">
          Request another time
        </button>
        <button type="button" disabled={busy} onClick={() => void respond('DECLINED')} className="rounded border border-rose-400 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 disabled:opacity-50">
          Decline
        </button>
      </div>

      {rescheduling && (
        <div className="max-w-xl space-y-2 border-l-2 border-amber-400 pl-3">
          <label htmlFor={`reschedule-${id}`} className="block text-xs font-bold text-slate-800">
            Why do you need another time?
          </label>
          <textarea
            id={`reschedule-${id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            className="w-full rounded border border-slate-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void respond('RESCHEDULE_REQUESTED')} className="rounded bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              Send request
            </button>
            <button type="button" disabled={busy} onClick={() => { setRescheduling(false); setComment('') }} className="rounded border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {current && <p className="text-xs text-slate-500">Your response: {current.replaceAll('_', ' ').toLowerCase()}</p>}
      {message && <p role="status" className="text-xs text-slate-600">{message}</p>}
    </div>
  )
}
