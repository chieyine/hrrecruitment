'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function OfferManager({
  candidates,
  templates,
  embedded = false,
}: {
  candidates: Array<{ id: string; name: string; position: string; dutyStation: string; contractType: string }>
  templates: Array<{ id: string; name: string }>
  embedded?: boolean
}) {
  const router = useRouter()
  const [applicationId, setApplicationId] = useState('')
  const [salary, setSalary] = useState('')
  const [startDate, setStartDate] = useState('')
  const [acceptanceDeadline, setAcceptanceDeadline] = useState('')
  const [offerTemplateId, setOfferTemplateId] = useState('')
  const [contractDuration, setContractDuration] = useState('')
  const [endDate, setEndDate] = useState('')
  const [probationPeriod, setProbationPeriod] = useState('')
  const [reportingLine, setReportingLine] = useState('')
  const [conditions, setConditions] = useState('')
  const [message, setMessage] = useState('')
  const selected = candidates.find((item) => item.id === applicationId)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!selected) return
    const response = await fetch('/api/recruitment/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        offerTemplateId: offerTemplateId || undefined,
        contractDuration: contractDuration || undefined,
        salary,
        startDate,
        endDate: endDate || undefined,
        probationPeriod: probationPeriod || undefined,
        reportingLine: reportingLine || undefined,
        conditions: conditions || undefined,
        acceptanceDeadline: new Date(`${acceptanceDeadline}T23:59:59.999`).toISOString(),
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Offer submitted for independent approval.' : data.error || 'Offer creation failed.')
    if (response.ok) {
      setApplicationId('')
      setSalary('')
      setStartDate('')
      setAcceptanceDeadline('')
      setOfferTemplateId('')
      setContractDuration('')
      setEndDate('')
      setProbationPeriod('')
      setReportingLine('')
      setConditions('')
      router.refresh()
    }
  }
  return (
    <form onSubmit={submit} className={embedded ? 'space-y-5 px-5 py-5 sm:px-6' : 'section-panel space-y-5'}>
      <div>
        <p className="mt-1 text-sm text-stone-600">
          Choose the approved candidate and enter the terms that will appear in the PDF preview.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          required
          aria-label="Candidate"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          className="field-control"
        >
          <option value="">Select recommended candidate</option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.position}
            </option>
          ))}
        </select>
        <select
          aria-label="Offer template"
          value={offerTemplateId}
          onChange={(event) => setOfferTemplateId(event.target.value)}
          className="field-control"
        >
          <option value="">Standard offer wording</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <input
          required
          aria-label="Approved compensation"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="Approved compensation and period"
          className="field-control"
        />
        <input
          aria-label="Contract duration"
          value={contractDuration}
          onChange={(e) => setContractDuration(e.target.value)}
          placeholder="Contract duration"
          className="field-control"
        />
        <label className="text-xs text-slate-600">
          Start date
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field-control mt-1"
          />
        </label>
        <label className="text-xs text-slate-600">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field-control mt-1"
          />
        </label>
        <label className="text-xs text-slate-600">
          Acceptance deadline
          <input
            required
            type="date"
            value={acceptanceDeadline}
            onChange={(e) => setAcceptanceDeadline(e.target.value)}
            className="field-control mt-1"
          />
        </label>
        <input
          aria-label="Probation period"
          value={probationPeriod}
          onChange={(e) => setProbationPeriod(e.target.value)}
          placeholder="Probation period"
          className="field-control"
        />
        <input
          aria-label="Reporting line"
          value={reportingLine}
          onChange={(e) => setReportingLine(e.target.value)}
          placeholder="Reports to"
          className="field-control"
        />
        <textarea
          aria-label="Offer conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Conditions, if any"
          rows={2}
          className="field-control md:col-span-2 xl:col-span-3"
        />
      </div>
      <button className="btn-primary">Submit for approval</button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </form>
  )
}

export function OfferActions({ id, status, canWithdraw }: { id: string; status: string; canWithdraw: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const [withdrawing, setWithdrawing] = useState(false)
  const act = async (action: string, comment = '') => {
    const response = await fetch(`/api/recruitment/offers/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ action, comment }),
    })
    const data = await response.json()
    if (response.ok) {
      toast('success', `Offer ${action.toLowerCase()}${action.endsWith('E') ? 'd' : 'ed'}.`)
      setWithdrawing(false)
      router.refresh()
    } else toast('error', data.error || 'Failed')
  }
  return (
    <div className="flex flex-wrap gap-1">
      {status === 'APPROVED' && (
        <button onClick={() => act('SEND')} className="btn-primary min-h-0 px-3 py-1.5 text-xs">
          Send
        </button>
      )}
      {canWithdraw && !['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'].includes(status) && (
        <button
          onClick={() => setWithdrawing(true)}
          className="btn-secondary min-h-0 border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
        >
          Withdraw
        </button>
      )}
      <ReasonDialog
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        onConfirm={(reason: string) => act('WITHDRAW', reason)}
        title="Withdraw offer"
        description="The candidate is notified that the offer has been withdrawn."
        confirmLabel="Withdraw offer"
        reasonLabel="Withdrawal reason"
        reasonRequired
        tone="danger"
      />
    </div>
  )
}
