'use client'
import { useEffect, useState } from 'react'

const DEFAULT_REPORTS = [
  'pipeline',
  'candidate-stages',
  'assessments',
  'interviews',
  'references',
  'offers',
  'preboarding',
  'outstanding',
  'courses',
  'readiness',
  'resumption',
  'erp',
  'waivers',
  'work-items',
  'communications',
  'approvals',
  'privacy-deletions',
  'delivery',
  'data-quality',
]
const reportLabel = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function ReportScheduler({
  defaultEmail,
  reportTypes = DEFAULT_REPORTS,
}: {
  defaultEmail: string
  reportTypes?: readonly string[]
}) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [reportType, setReportType] = useState('pipeline')
  const [format, setFormat] = useState('xlsx')
  const [frequency, setFrequency] = useState('WEEKLY')
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail)
  const [nextRunAt, setNextRunAt] = useState('')
  const [message, setMessage] = useState('')
  const load = async () => {
    const response = await fetch('/api/recruitment/reports/schedules')
    const data = await response.json()
    if (response.ok) setSchedules(data.schedules || [])
  }
  useEffect(() => {
    void load()
  }, [])
  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/recruitment/reports/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, format, frequency, recipientEmail, nextRunAt }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Report delivery scheduled.' : data.error || 'Failed')
    if (response.ok) void load()
  }
  const disable = async (id: string) => {
    const response = await fetch('/api/recruitment/reports/schedules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (response.ok) void load()
  }
  return (
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-950">Scheduled deliveries</h2>
          <p className="mt-1 text-sm text-slate-600">Email an up-to-date report automatically.</p>
        </div>
      </div>
      <form onSubmit={create} className="grid gap-5 px-5 py-6 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
        <label className="md:col-span-2 xl:col-span-1">
          <span className="field-label">Report</span>
          <select
            aria-label="Report"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            className="field-control"
          >
            {reportTypes.map((value) => (
              <option key={value} value={value}>
                {reportLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Format</span>
          <select
            aria-label="Format"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="field-control"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel workbook</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <label>
          <span className="field-label">Frequency</span>
          <select
            aria-label="Frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            className="field-control"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
        <label>
          <span className="field-label">Recipient email</span>
          <input
            aria-label="Recipient email"
            type="email"
            required
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            className="field-control"
          />
        </label>
        <label>
          <span className="field-label">First delivery</span>
          <input
            aria-label="First delivery"
            type="datetime-local"
            required
            value={nextRunAt}
            onChange={(event) => setNextRunAt(event.target.value)}
            className="field-control"
          />
        </label>
        <div className="flex items-end md:col-span-2 xl:col-span-3">
          <button className="btn-primary">Schedule delivery</button>
        </div>
      </form>
      {message && (
        <p role="status" className="border-t border-stone-200 bg-brand-50 px-5 py-3 text-sm text-brand-900 sm:px-6">
          {message}
        </p>
      )}
      <div className="divide-y divide-stone-200 border-t border-stone-200">
        {schedules.length === 0 && (
          <div className="px-5 py-8 text-center sm:px-6">
            <p className="text-sm font-semibold text-stone-800">No scheduled deliveries</p>
            <p className="mt-1 text-sm text-stone-500">Use the form above to create the first one.</p>
          </div>
        )}
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex justify-between gap-5 px-5 py-4 text-sm sm:px-6">
            <span>
              <strong className="text-navy-950">{reportLabel(schedule.reportType)}</strong>
              <span className="mt-1 block text-xs text-stone-500">
                {reportLabel(schedule.frequency)} · next {new Date(schedule.nextRunAt).toLocaleString()} ·{' '}
                {schedule.active ? 'Active' : 'Disabled'}
              </span>
            </span>
            {schedule.active && (
              <button onClick={() => void disable(schedule.id)} className="font-semibold text-rose-700">
                Disable
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
