'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck, Undo2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { PageSkeleton } from '@/components/ui/Skeleton'

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

  async function decide(approvalId: string, decision: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'SATISFY_CONDITIONS' | 'RETURNED' | 'REJECTED', comment = '') {
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
      toast('success', decision === 'APPROVED' ? 'Approval completed.' : decision === 'APPROVED_WITH_CONDITIONS' ? 'Conditions sent to the requester.' : decision === 'SATISFY_CONDITIONS' ? 'Evidence returned to the approver.' : decision === 'RETURNED' ? 'Returned for clarification.' : 'Request rejected.')
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/recruitment/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
              <ShieldCheck className="h-3.5 w-3.5" /> Approvals
            </span>
            <h1 className="text-3xl font-extrabold mt-2">Pending Approvals</h1>
            <p className="text-slate-300 text-sm mt-1">Vacancies, selections, and offers awaiting independent sign-off.</p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          )}

          {loading ? (
            <PageSkeleton />
          ) : approvals.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No pending approvals.
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{a.resourceType}</span>
                    {a.detail ? (
                      <>
                        <h4 className="font-bold text-slate-900 text-sm">{a.detail.candidate} — {a.detail.vacancy}</h4>
                        <p className="text-slate-500">
                          Outcome: <strong>{a.detail.outcome}</strong>{a.detail.rank ? ` • Rank ${a.detail.rank}` : ''}
                          {a.detail.overrideFlag ? ' • Ranking override' : ''}
                        </p>
                        {a.detail.justification && <p className="text-slate-500 italic">“{a.detail.justification}”</p>}
                        {a.conditions?.map((condition: any) => <div key={condition.id} className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 not-italic"><p className="font-semibold text-amber-950">{condition.description}</p><p className="mt-1 text-[11px] text-amber-800">{condition.status.replaceAll('_', ' ')}{condition.dueAt ? ` · due ${new Date(condition.dueAt).toLocaleDateString()}` : ''}</p>{condition.evidenceNote && <p className="mt-1 text-slate-700">Evidence: {condition.evidenceNote}</p>}</div>)}
                      </>
                    ) : (
                      <h4 className="font-bold text-slate-900 text-sm">Approval {a.id.slice(0, 8)}</h4>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.decision === 'CONDITIONS_PENDING' ? <button onClick={() => setSatisfying(a.id)} disabled={busyId === a.id} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">Submit condition evidence</button> : <>
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
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => { if (rejecting) return decide(rejecting, 'REJECTED', reason) }}
        title="Reject approval request"
        description="This returns the item to the responsible recruitment team."
        confirmLabel="Reject"
        reasonLabel="Reason for rejection"
        tone="danger"
        busy={busyId === rejecting}
      />
      <ReasonDialog
        open={satisfying !== null}
        onClose={() => setSatisfying(null)}
        onConfirm={(reason) => { if (satisfying) return decide(satisfying, 'SATISFY_CONDITIONS', reason) }}
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
        onConfirm={(reason) => { if (returning) return decide(returning, 'RETURNED', reason) }}
        title="Return for clarification"
        description="The requester can revise the item and submit it again."
        confirmLabel="Return"
        reasonLabel="Clarification required"
        busy={busyId === returning}
      />
      <ReasonDialog
        open={conditioning !== null}
        onClose={() => setConditioning(null)}
        onConfirm={(reason) => { if (conditioning) return decide(conditioning, 'APPROVED_WITH_CONDITIONS', reason) }}
        title="Approve with conditions"
        description="Record the conditions that must be satisfied."
        confirmLabel="Approve with conditions"
        reasonLabel="Conditions"
        busy={busyId === conditioning}
      />
    </div>
  )
}
