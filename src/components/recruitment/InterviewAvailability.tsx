'use client'

import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

export default function InterviewAvailability() {
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [provider, setProvider] = useState('MICROSOFT')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const post = async (body: unknown, success: string) => {
    setBusy(true)
    try {
      const response = await fetch('/api/recruitment/interviews/availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Availability could not be saved')
      toast('success', success)
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Availability could not be saved')
    } finally { setBusy(false) }
  }

  const validRange = startAt && endAt && new Date(endAt) > new Date(startAt)
  return (
    <section className="section-panel">
      <div className="section-heading"><div><h2 className="text-lg font-semibold text-navy-900">Panel availability</h2><p className="mt-1 text-sm text-stone-600">Declare a free window or sync busy time from a connected calendar.</p></div></div>
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] sm:px-6">
        <label className="text-xs font-semibold text-stone-600">Available from<input type="datetime-local" className="field-control mt-1" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
        <label className="text-xs font-semibold text-stone-600">Available until<input type="datetime-local" className="field-control mt-1" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
        <button type="button" className="btn-primary self-end" disabled={busy || !validRange} onClick={() => post({ action: 'DECLARE', windows: [{ startAt, endAt, busy: false }], timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }, 'Availability saved.')}><CalendarClock className="h-4 w-4" /> Save window</button>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
        <label className="text-xs font-semibold text-stone-600">Connected provider<select className="field-control mt-1" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="MICROSOFT">Microsoft</option><option value="GOOGLE">Google</option></select></label>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { const from = new Date(); const to = new Date(from.getTime() + 30 * 86_400_000); void post({ action: 'SYNC', provider, from, to }, 'Calendar availability synced.') }}>Sync next 30 days</button>
      </div>
    </section>
  )
}
