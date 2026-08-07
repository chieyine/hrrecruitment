'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { Dialog } from '@/components/ui/Dialog'

type Preview = {
  readiness: { ready: boolean; blockers: string[]; warnings: string[] }
  duplicateCheck: { status: string; matches?: Array<{ reason?: string }> }
  statutoryGaps: string[]
  canApprove: boolean
}

export default function ErpTransferApproval({ applicationId }: { applicationId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [duplicateNote, setDuplicateNote] = useState('')
  const [comment, setComment] = useState('')
  const { toast } = useToast()

  const inspect = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}/erp-transfer/approve`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Readiness could not be checked')
      setPreview(data)
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Readiness could not be checked') }
    finally { setBusy(false) }
  }

  const approve = async () => {
    if (!preview) return
    const duplicate = preview.duplicateCheck.status === 'POSSIBLE_DUPLICATE'
    if (duplicate && !duplicateNote.trim()) return
    setBusy(true)
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}/erp-transfer/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acknowledgeDuplicate: duplicate,
          duplicateNote: duplicateNote || undefined,
          comment: comment || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Transfer approval failed')
      toast('success', 'ERP transfer approved and signed.')
      setApprovalOpen(false)
      window.location.reload()
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Transfer approval failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-3 border-t border-stone-200 pt-3">
      {!preview ? (
        <button type="button" className="btn-secondary" disabled={busy} onClick={inspect}><ShieldCheck className="h-4 w-4" /> Check readiness</button>
      ) : (
        <div className="space-y-2 text-xs">
          {preview.readiness.blockers.length > 0 && <p className="text-rose-700">Blocked: {preview.readiness.blockers.join('; ')}</p>}
          {preview.statutoryGaps.length > 0 && <p className="text-amber-800">Pack gaps: {preview.statutoryGaps.join('; ')}</p>}
          <p className="text-stone-600">Duplicate check: {preview.duplicateCheck.status.replaceAll('_', ' ').toLowerCase()}</p>
          {preview.canApprove && preview.readiness.blockers.filter((item) => !item.startsWith('HR Manager approval')).length === 0 && (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => setApprovalOpen(true)}>Approve and sign transfer</button>
          )}
        </div>
      )}
      <Dialog open={approvalOpen} onClose={() => setApprovalOpen(false)} title="Approve ERP transfer">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void approve()
          }}
        >
          {preview?.duplicateCheck.status === 'POSSIBLE_DUPLICATE' && (
            <label className="block">
              <span className="field-label">Duplicate review</span>
              <textarea
                required
                rows={3}
                className="field-control"
                value={duplicateNote}
                onChange={(event) => setDuplicateNote(event.target.value)}
                placeholder="Explain why this is not the same employee."
              />
            </label>
          )}
          <label className="block">
            <span className="field-label">Approval note (optional)</span>
            <textarea rows={3} className="field-control" value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setApprovalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Approving…' : 'Approve and sign'}</button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
