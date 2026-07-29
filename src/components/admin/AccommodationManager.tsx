'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReasonDialog } from '@/components/ui/Dialog'

type RequestRecord = {
  id: string
  applicationId: string
  requestType: string
  details: string
  status: string
  requestedAt: string
  candidateName: string
  vacancy: string
}

export default function AccommodationManager({
  requests,
  canDecide,
}: {
  requests: RequestRecord[]
  canDecide: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [pending, setPending] = useState<{ id: string; status: string } | null>(null)
  async function decide(id: string, status: string, decision: string) {
    setBusy(id)
    const response = await fetch('/api/recruitment/accommodations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, decision }),
    })
    const data = await response.json()
    setBusy('')
    setMessageIsError(!response.ok)
    setMessage(response.ok ? 'Request updated and the candidate was notified.' : data.error || 'Update failed')
    if (response.ok) {
      setPending(null)
      router.refresh()
    }
  }
  return (
    <section aria-labelledby="adjustment-queue-heading" className="section-panel">
      <div className="section-heading">
        <div>
          <h2 id="adjustment-queue-heading" className="text-lg font-semibold text-navy-950">
            Requests to review
          </h2>
          <p className="mt-1 text-sm text-stone-600">Oldest requests are shown first.</p>
        </div>
        <span className="text-sm font-semibold text-stone-500">{requests.length} open</span>
      </div>
      {message && (
        <p
          role={messageIsError ? 'alert' : 'status'}
          className={`border-b px-5 py-3 text-sm font-medium ${
            messageIsError ? 'border-red-200 bg-red-50 text-red-900' : 'border-brand-200 bg-brand-50 text-brand-900'
          }`}
        >
          {message}
        </p>
      )}
      <div className="divide-y divide-stone-200">
        {requests.map((request) => (
          <article key={request.id} className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-chip border-brand-200 bg-brand-50 text-brand-800">
                  {request.requestType.replaceAll('_', ' ').toLowerCase()}
                </span>
                <span className="status-chip border-stone-200 bg-stone-100 text-stone-700">
                  {request.status.replaceAll('_', ' ').toLowerCase()}
                </span>
                <span className="text-xs text-stone-500">Received {request.requestedAt}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-navy-950">{request.candidateName}</h3>
              <p className="mt-0.5 text-sm text-stone-500">{request.vacancy}</p>
              <div className="mt-4 border-l-2 border-stone-300 pl-4">
                <p className="text-sm leading-6 text-stone-700">{request.details}</p>
              </div>
              <Link
                href={`/recruitment/applications/${request.applicationId}`}
                className="mt-4 inline-flex text-sm font-semibold text-brand-800 hover:underline"
              >
                Open application
              </Link>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2 lg:max-w-72 lg:justify-end">
              {request.status === 'REQUESTED' && (
                <button
                  disabled={busy === request.id}
                  onClick={() => setPending({ id: request.id, status: 'UNDER_REVIEW' })}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Start review
                </button>
              )}
              {canDecide && ['REQUESTED', 'UNDER_REVIEW'].includes(request.status) && (
                <>
                  <button
                    disabled={busy === request.id}
                    onClick={() => setPending({ id: request.id, status: 'APPROVED' })}
                    className="rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
                  >
                    Agree
                  </button>
                  <button
                    disabled={busy === request.id}
                    onClick={() => setPending({ id: request.id, status: 'PARTIALLY_APPROVED' })}
                    className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Agree in part
                  </button>
                  <button
                    disabled={busy === request.id}
                    onClick={() => setPending({ id: request.id, status: 'DECLINED' })}
                    className="rounded-lg px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </>
              )}
              {['APPROVED', 'PARTIALLY_APPROVED'].includes(request.status) && (
                <button
                  disabled={busy === request.id}
                  onClick={() => setPending({ id: request.id, status: 'FULFILLED' })}
                  className="rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
                >
                  Confirm ready
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!requests.length && (
        <div className="px-6 py-12 text-center">
          <h3 className="font-semibold text-navy-950">Nothing is waiting</h3>
          <p className="mt-1 text-sm text-stone-600">There are no open adjustment requests.</p>
        </div>
      )}
      <ReasonDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={(decision) => (pending ? decide(pending.id, pending.status, decision) : undefined)}
        title={
          pending?.status === 'FULFILLED'
            ? 'Confirm adjustment provided'
            : pending?.status === 'UNDER_REVIEW'
              ? 'Start reviewing this request'
              : pending?.status === 'DECLINED'
                ? 'Decline adjustment request'
                : 'Record adjustment decision'
        }
        description={
          pending?.status === 'UNDER_REVIEW'
            ? 'Tell the candidate what will happen next. This message will be visible to them.'
            : pending?.status === 'FULFILLED'
              ? 'Record how the agreed adjustment was put in place. This note is retained in the audit record.'
              : 'Write down what FRAD agreed to provide. The candidate will receive this wording.'
        }
        confirmLabel={
          pending?.status === 'UNDER_REVIEW'
            ? 'Start review'
            : pending?.status === 'FULFILLED'
              ? 'Confirm ready'
              : 'Save decision'
        }
        reasonLabel={pending?.status === 'FULFILLED' ? 'Fulfilment note' : 'Response to the candidate'}
        reasonRequired
        busy={Boolean(pending && busy === pending.id)}
        tone={pending?.status === 'DECLINED' ? 'danger' : 'default'}
      />
    </section>
  )
}
