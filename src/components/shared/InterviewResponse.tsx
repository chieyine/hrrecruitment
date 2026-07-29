'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/Dialog'

export default function InterviewResponse({ id, current }: { id: string; current: string | null }) {
  const router = useRouter()
  const [rescheduling, setRescheduling] = useState(false)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState(false)

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
      setConfirmingDecline(false)
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
        <button
          type="button"
          disabled={busy}
          onClick={() => void respond('CONFIRMED')}
          className="btn-primary min-h-10 px-4 py-2 text-xs"
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRescheduling(true)}
          className="btn-secondary min-h-10 px-4 py-2 text-xs"
        >
          Request another time
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmingDecline(true)}
          className="min-h-10 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-800 disabled:opacity-50"
        >
          Decline
        </button>
      </div>

      {rescheduling && (
        <div className="max-w-xl space-y-3 border-l-2 border-amber-400 pl-4">
          <label htmlFor={`reschedule-${id}`} className="block text-xs font-bold text-slate-800">
            Why do you need another time?
          </label>
          <textarea
            id={`reschedule-${id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            className="field-control"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond('RESCHEDULE_REQUESTED')}
              className="btn-primary min-h-10 px-4 py-2 text-xs"
            >
              Send request
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRescheduling(false)
                setComment('')
              }}
              className="btn-secondary min-h-10 px-4 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {current && (
        <p className="text-xs text-slate-500">
          Your response:{' '}
          {current
            .replaceAll('_', ' ')
            .toLowerCase()
            .replace(/^./, (letter) => letter.toUpperCase())}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
      <ConfirmDialog
        open={confirmingDecline}
        onClose={() => {
          if (!busy) setConfirmingDecline(false)
        }}
        onConfirm={() => respond('DECLINED')}
        title="Decline this interview?"
        description="FRAD will record that you will not attend. You can message the recruitment team if you need to explain."
        confirmLabel="Decline interview"
        tone="danger"
        busy={busy}
      />
    </div>
  )
}
