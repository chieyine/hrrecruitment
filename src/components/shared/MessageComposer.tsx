'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

export default function MessageComposer({
  applicationId,
  threadId,
  applications,
}: {
  applicationId?: string
  threadId?: string
  applications?: Array<{ id: string; label: string }>
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState(applicationId || applications?.[0]?.id || '')
  const [templates, setTemplates] = useState<Array<{ id: string; code: string; subject: string; body: string }>>([])

  useEffect(() => {
    const targetApplicationId = applicationId || selectedApplicationId
    const query = targetApplicationId
      ? `applicationId=${encodeURIComponent(targetApplicationId)}`
      : `threadId=${encodeURIComponent(threadId || '')}`
    fetch(`/api/messages?${query}`)
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        setTemplates(data.templates || [])
      })
      .catch(() => undefined)
  }, [applicationId, selectedApplicationId, threadId])

  const targetApplicationId = applicationId || selectedApplicationId
  if (!targetApplicationId && !threadId) {
    return <p className="text-xs text-slate-400">You can message HR once you have an active application.</p>
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: targetApplicationId || undefined, threadId, body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setBody('')
      toast('success', 'Message sent.')
      router.refresh() // re-render the server component with the new message
    } catch (error: unknown) {
      toast('error', error instanceof Error ? error.message : 'The message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className="space-y-2">
      {!threadId && applications && applications.length > 1 && (
        <label className="block">
          <span className="field-label">Application</span>
          <select
            value={selectedApplicationId}
            onChange={(event) => setSelectedApplicationId(event.target.value)}
            className="field-control"
          >
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {!threadId && applications?.length === 1 && (
        <p className="text-xs text-stone-600">
          <span className="font-semibold text-stone-800">Application:</span> {applications[0].label}
        </p>
      )}
      {templates.length > 0 && (
        <label className="block">
          <span className="field-label">Start from an approved template</span>
          <select
            defaultValue=""
            onChange={(event) => {
              const template = templates.find((item) => item.id === event.target.value)
              if (template) setBody(template.body)
            }}
            className="field-control"
          >
            <option value="">Write a message without a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.subject} ({template.code.replaceAll('_', ' ').toLowerCase()})
              </option>
            ))}
          </select>
          <span className="field-help">Review and adjust the final message before sending it.</span>
        </label>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write your message…"
        aria-label="Message"
        className="field-control"
      />
      <div className="flex justify-end">
        <button type="submit" disabled={sending} className="btn-primary min-h-10 px-4 py-2 text-xs">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </button>
      </div>
    </form>
  )
}
