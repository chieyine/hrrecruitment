'use client'

import { useEffect, useState } from 'react'

export default function NotificationPreferences() {
  const [form, setForm] = useState({ immediateEmailEnabled: true, digestEnabled: true, digestHourLocal: 8 })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch('/api/account/notification-preferences').then(async (response) => {
      if (response.ok) setForm((await response.json()).preference)
    })
  }, [])
  const save = async () => {
    setBusy(true)
    const response = await fetch('/api/account/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const body = await response.json().catch(() => ({}))
    setMessage(response.ok ? 'Notification preferences saved.' : body.error || 'The preferences could not be saved.')
    setBusy(false)
  }
  return (
    <section className="section-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-navy-950">Email notifications</h2>
      <p className="mt-1 text-sm text-stone-600">Urgent invitations, offers and security messages can arrive immediately. Routine reminders can be grouped into one daily email.</p>
      <div className="mt-5 space-y-4">
        <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" className="mt-1" checked={form.immediateEmailEnabled} onChange={(event) => setForm({ ...form, immediateEmailEnabled: event.target.checked })} /><span><strong className="block text-stone-950">Immediate important emails</strong>Assessment and interview invitations, offers and account-security messages.</span></label>
        <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" className="mt-1" checked={form.digestEnabled} onChange={(event) => setForm({ ...form, digestEnabled: event.target.checked })} /><span><strong className="block text-stone-950">Daily reminder digest</strong>Routine tasks and reminders in one email.</span></label>
        {form.digestEnabled && <label className="block max-w-xs"><span className="field-label">Send digest after</span><select className="field-control" value={form.digestHourLocal} onChange={(event) => setForm({ ...form, digestHourLocal: Number(event.target.value) })}>{[7, 8, 9, 10, 12, 15].map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>}
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save preferences'}</button>
        {message && <p role="status" className="text-sm text-stone-600">{message}</p>}
      </div>
    </section>
  )
}
