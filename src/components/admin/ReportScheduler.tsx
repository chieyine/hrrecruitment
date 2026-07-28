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
          <h2 className="text-lg font-bold text-slate-950">Scheduled report delivery</h2>
          <p className="mt-1 text-sm text-slate-600">
            Send a current register to an approved mailbox on a recurring schedule.
          </p>
        </div>
      </div>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label>
          <span className="field-label">Report</span>
          <select
            aria-label="Report"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            className="field-control"
          >
            {reportTypes.map((value) => (
              <option key={value}>{value}</option>
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
            <option>csv</option>
            <option>xlsx</option>
            <option>pdf</option>
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
            <option>DAILY</option>
            <option>WEEKLY</option>
            <option>MONTHLY</option>
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
        <button className="btn-primary xl:col-start-5">Schedule delivery</button>
      </form>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      <div className="mt-5 space-y-2">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex justify-between border border-slate-200 p-3 text-sm">
            <span>
              {schedule.reportType} · {schedule.frequency} · next {new Date(schedule.nextRunAt).toLocaleString()} ·{' '}
              {schedule.active ? 'active' : 'disabled'}
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
