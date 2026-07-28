'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function OfferManager({
  candidates,
  templates,
}: {
  candidates: Array<{ id: string; name: string; position: string; dutyStation: string; contractType: string }>
  templates: Array<{ id: string; name: string }>
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
        position: selected.position,
        dutyStation: selected.dutyStation,
        contractType: selected.contractType,
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
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="font-bold text-slate-900">Prepare an offer</h2>
        <p className="mt-1 text-xs text-slate-600">
          Record the complete approved terms before sending the offer for independent approval.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          required
          aria-label="Candidate"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          className="rounded-lg border border-slate-300 p-2 text-sm"
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
          className="rounded-lg border border-slate-300 p-2 text-sm"
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
          className="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <input
          aria-label="Contract duration"
          value={contractDuration}
          onChange={(e) => setContractDuration(e.target.value)}
          placeholder="Contract duration"
          className="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <label className="text-xs text-slate-600">
          Start date
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Acceptance deadline
          <input
            required
            type="date"
            value={acceptanceDeadline}
            onChange={(e) => setAcceptanceDeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>
        <input
          aria-label="Probation period"
          value={probationPeriod}
          onChange={(e) => setProbationPeriod(e.target.value)}
          placeholder="Probation period"
          className="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <input
          aria-label="Reporting line"
          value={reportingLine}
          onChange={(e) => setReportingLine(e.target.value)}
          placeholder="Reports to"
          className="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <textarea
          aria-label="Offer conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Conditions, if any"
          rows={2}
          className="rounded-lg border border-slate-300 p-2 text-sm md:col-span-2 xl:col-span-3"
        />
      </div>
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white">Submit for approval</button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </form>
  )
}

export function OfferActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [withdrawing, setWithdrawing] = useState(false)
  const act = async (action: string, comment = '') => {
    const response = await fetch(`/api/recruitment/offers/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      {status === 'PENDING_APPROVAL' && (
        <button
          onClick={() => act('APPROVE')}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Approve
        </button>
      )}
      {status === 'APPROVED' && (
        <button
          onClick={() => act('SEND')}
          className="rounded bg-brand-600 px-2 py-1 text-xs font-bold text-white hover:bg-brand-700"
        >
          Send
        </button>
      )}
      {!['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'].includes(status) && (
        <button
          onClick={() => setWithdrawing(true)}
          className="rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700"
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
