'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck, Undo2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

export default function ApprovalsPage() {
  const { toast } = useToast()
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [returning, setReturning] = useState<string | null>(null)
  const [conditioning, setConditioning] = useState<string | null>(null)
  const [satisfying, setSatisfying] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/recruitment/approvals')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load approvals')
      setApprovals(json.approvals || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function decide(
    approvalId: string,
    decision: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'SATISFY_CONDITIONS' | 'RETURNED' | 'REJECTED',
    comment = ''
  ) {
    setBusyId(approvalId)
    try {
      const res = await fetch('/api/recruitment/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          decision,
          comment,
          lockVersion: approvals.find((approval) => approval.id === approvalId)?.lockVersion,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      toast(
        'success',
        decision === 'APPROVED'
          ? 'Approval completed.'
          : decision === 'APPROVED_WITH_CONDITIONS'
            ? 'Conditions sent to the requester.'
            : decision === 'SATISFY_CONDITIONS'
              ? 'Evidence returned to the approver.'
              : decision === 'RETURNED'
                ? 'Returned for clarification.'
                : 'Request rejected.'
      )
      setRejecting(null)
      setReturning(null)
      setConditioning(null)
      setSatisfying(null)
      await load()
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />
      <main id="main-content" className="flex-1 py-10">
        <div className="page-shell max-w-5xl space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to recruitment
          </Link>

          <PageIntro
            title="Items awaiting your decision"
            description="Check the source record before you approve. Return anything that is incomplete or unclear."
            actions={
              <div className="flex items-center gap-3 border-l-2 border-[#bc6747] pl-4">
                <ShieldCheck className="h-5 w-5 text-brand-700" />
                <span className="text-sm text-stone-600">{approvals.length} waiting</span>
              </div>
            }
          />

          {error && (
            <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <PageSkeleton />
          ) : approvals.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing waiting for your decision"
              description="New requests assigned to you will appear here."
            />
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <article key={a.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <span className="status-chip border-stone-200 bg-stone-100 text-stone-700">
                          {a.resourceType.toLowerCase()}
                          {a.stage > 1 ? ` · stage ${a.stage}` : ''}
                        </span>
                        {a.detail ? (
                          <>
                            <h2 className="mt-3 text-lg font-semibold text-stone-950">
                              {a.detail.candidate} · {a.detail.vacancy}
                            </h2>
                            {a.detail.href && (
                              <div className="mt-2 flex flex-wrap gap-4">
                                <Link
                                  href={a.detail.href}
                                  className="inline-flex text-sm font-semibold text-brand-800 hover:underline"
                                >
                                  {a.detail.hrefLabel || 'Review source record'}
                                </Link>
                                {a.detail.documentHref && (
                                  <a
                                    href={a.detail.documentHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex text-sm font-semibold text-brand-800 hover:underline"
                                  >
                                    Preview offer letter
                                  </a>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <h2 className="mt-3 text-lg font-semibold text-stone-950">Approval {a.id.slice(0, 8)}</h2>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        Submitted {new Date(a.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    {a.detail ? (
                      <>
                        {a.detail.fields?.length > 0 && (
                          <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-3">
                            {a.detail.fields.map((field: any) => (
                              <div key={field.label} className="bg-white p-3">
                                <dt className="text-xs text-stone-500">{field.label}</dt>
                                <dd className="mt-1 text-sm font-semibold capitalize text-stone-950">{field.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {a.detail.overrideFlag && (
                          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                            The proposed selection is outside the funded ranking.
                          </p>
                        )}
                        {a.detail.justification && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-stone-500">
                              {a.resourceType === 'VACANCY'
                                ? 'Role summary'
                                : a.resourceType === 'OFFER'
                                  ? 'Conditions'
                                  : 'Decision reason'}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                              {a.detail.justification}
                            </p>
                          </div>
                        )}
                        {a.conditions?.map((condition: any) => (
                          <div
                            key={condition.id}
                            className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 not-italic"
                          >
                            <p className="font-semibold text-amber-950">{condition.description}</p>
                            <p className="mt-1 text-[11px] text-amber-800">
                              {condition.status.replaceAll('_', ' ')}
                              {condition.dueAt ? ` · due ${new Date(condition.dueAt).toLocaleDateString()}` : ''}
                            </p>
                            {condition.evidenceNote && (
                              <p className="mt-1 text-slate-700">Evidence: {condition.evidenceNote}</p>
                            )}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:px-6">
                    {a.decision === 'CONDITIONS_PENDING' ? (
                      <button
                        onClick={() => setSatisfying(a.id)}
                        disabled={busyId === a.id}
                        className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white"
                      >
                        Submit condition evidence
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => decide(a.id, 'APPROVED')}
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => setConditioning(a.id)}
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" /> With conditions
                        </button>
                        <button
                          onClick={() => setReturning(a.id)}
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          <Undo2 className="h-4 w-4" /> Clarify
                        </button>
                        <button
                          onClick={() => setRejecting(a.id)}
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) return decide(rejecting, 'REJECTED', reason)
        }}
        title="Reject approval request"
        description="This returns the item to the responsible recruitment team."
        confirmLabel="Reject"
        reasonLabel="Reason for rejection"
        reasonRequired
        tone="danger"
        busy={busyId === rejecting}
      />
      <ReasonDialog
        open={satisfying !== null}
        onClose={() => setSatisfying(null)}
        onConfirm={(reason) => {
          if (satisfying) return decide(satisfying, 'SATISFY_CONDITIONS', reason)
        }}
        title="Submit evidence for approval conditions"
        description="Explain what changed and where the approver can verify it. The item returns to the original approver for a final decision."
        confirmLabel="Return to approver"
        reasonLabel="Evidence and response"
        reasonRequired
        busy={busyId === satisfying}
      />
      <ReasonDialog
        open={returning !== null}
        onClose={() => setReturning(null)}
        onConfirm={(reason) => {
          if (returning) return decide(returning, 'RETURNED', reason)
        }}
        title="Return for clarification"
        description="The requester can revise the item and submit it again."
        confirmLabel="Return"
        reasonLabel="Clarification required"
        reasonRequired
        busy={busyId === returning}
      />
      <ReasonDialog
        open={conditioning !== null}
        onClose={() => setConditioning(null)}
        onConfirm={(reason) => {
          if (conditioning) return decide(conditioning, 'APPROVED_WITH_CONDITIONS', reason)
        }}
        title="Approve with conditions"
        description="Record the conditions that must be satisfied."
        confirmLabel="Approve with conditions"
        reasonLabel="Conditions"
        reasonRequired
        busy={busyId === conditioning}
      />
    </div>
  )
}
