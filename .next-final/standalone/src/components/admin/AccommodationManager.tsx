'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReasonDialog } from '@/components/ui/Dialog'

type RequestRecord = { id: string; requestType: string; details: string; status: string; candidateName: string; vacancy: string }

export default function AccommodationManager({ requests }: { requests: RequestRecord[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<{ id: string; status: string } | null>(null)
  async function decide(id: string, status: string, decision: string) {
    setBusy(id)
    const response = await fetch('/api/recruitment/accommodations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, decision }) })
    const data = await response.json()
    setBusy('')
    setMessage(response.ok ? 'Request updated and the candidate was notified.' : data.error || 'Update failed')
    if (response.ok) { setPending(null); router.refresh() }
  }
  return <div className="space-y-3">
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800">{message}</p>}
    {requests.map((request) => <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row">
        <div><div className="flex gap-2"><span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-800">{request.requestType}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{request.status.replaceAll('_', ' ')}</span></div><h2 className="mt-2 font-bold">{request.candidateName}</h2><p className="text-xs text-slate-500">{request.vacancy}</p><p className="mt-3 max-w-3xl text-sm text-slate-700">{request.details}</p></div>
        <div className="flex shrink-0 flex-wrap items-start gap-2">
          {!['APPROVED', 'PARTIALLY_APPROVED'].includes(request.status) && <><button disabled={busy === request.id} onClick={() => setPending({ id: request.id, status: 'APPROVED' })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={busy === request.id} onClick={() => setPending({ id: request.id, status: 'PARTIALLY_APPROVED' })} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800">Approve partly</button><button disabled={busy === request.id} onClick={() => setPending({ id: request.id, status: 'DECLINED' })} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700">Decline</button></>}
          {['APPROVED', 'PARTIALLY_APPROVED'].includes(request.status) && <button disabled={busy === request.id} onClick={() => setPending({ id: request.id, status: 'FULFILLED' })} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Mark adjustment provided</button>}
        </div>
      </div>
    </div>)}
    {!requests.length && <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No adjustment requests need review.</div>}
    <ReasonDialog open={Boolean(pending)} onClose={() => setPending(null)} onConfirm={(decision) => pending ? decide(pending.id, pending.status, decision) : undefined} title={pending?.status === 'FULFILLED' ? 'Confirm adjustment provided' : pending?.status === 'DECLINED' ? 'Decline adjustment request' : 'Record adjustment decision'} description="Record what was agreed or provided. The candidate will be notified." confirmLabel="Save decision" reasonLabel="Decision details" reasonRequired busy={Boolean(pending && busy === pending.id)} tone={pending?.status === 'DECLINED' ? 'danger' : 'default'} />
  </div>
}
