'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'
import { PageSkeleton } from '@/components/ui/Skeleton'

export default function DeletionRequestsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<{ id: string; decision: 'APPROVE' | 'REJECT' } | null>(null)
  const [legalOverride, setLegalOverride] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/deletion-requests')
      .then((r) => r.json())
      .then((d) => setItems(d.requests || []))
      .catch(() => toast('error', 'Failed to load deletion requests'))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (id: string, decision: 'APPROVE' | 'REJECT', reason: string) => {
    const response = await fetch('/api/admin/deletion-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, decision, reason, legalOverride: decision === 'APPROVE' && legalOverride }),
    })
    const data = await response.json()
    if (response.ok) {
      toast('success', 'Request processed.')
      setPending(null)
      setLegalOverride(false)
      void load()
    } else {
      toast('error', data.error || 'Failed')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Privacy deletion requests</h1>
        <p className="text-sm text-slate-600">
          Review consent withdrawals and closure requests. Completion anonymizes personal data while preserving required
          audit evidence.
        </p>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No deletion requests.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-4">
              <p className="font-bold">{item.candidate.user.email}</p>
              <p className="text-xs text-slate-600">
                {item.reason || 'No candidate reason'} — {item.status} — {item.candidate.applications.length}{' '}
                application(s)
              </p>
              {item.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPending({ id: item.id, decision: 'APPROVE' })}
                    className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800"
                  >
                    Approve anonymization
                  </button>
                  <button
                    onClick={() => setPending({ id: item.id, decision: 'REJECT' })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReasonDialog
        open={pending !== null}
        onClose={() => {
          setPending(null)
          setLegalOverride(false)
        }}
        onConfirm={(reason) => {
          if (pending) {
            return decide(pending.id, pending.decision, reason)
          }
        }}
        title={pending?.decision === 'APPROVE' ? 'Approve anonymization' : 'Reject deletion request'}
        description={
          pending?.decision === 'APPROVE'
            ? 'Personal data is anonymized irreversibly; audit evidence is preserved. Use the override below only for successful-recruitment records under legal retention.'
            : 'The candidate is notified that their request was declined.'
        }
        confirmLabel={pending?.decision === 'APPROVE' ? 'Anonymize' : 'Reject request'}
        reasonRequired
        tone="danger"
      />

      {pending?.decision === 'APPROVE' && (
        <label className="fixed bottom-6 left-1/2 z-[85] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 shadow-lg">
          <input
            type="checkbox"
            checked={legalOverride}
            onChange={(e) => setLegalOverride(e.target.checked)}
            className="h-4 w-4 rounded border-amber-400"
          />
          Apply legal-retention override (successful recruitment record)
        </label>
      )}
    </div>
  )
}
