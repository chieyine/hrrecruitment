'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function DeleteDraftButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/candidate/applications/${applicationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'The draft could not be deleted.')
      }
    } catch {
      setError('The draft could not be deleted. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('')
          setOpen(true)
        }}
        className="flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
        aria-label="Delete draft"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete draft
      </button>
      {error && (
        <p role="alert" className="basis-full text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      <ReasonDialog
        open={open}
        onClose={() => {
          if (!deleting) setOpen(false)
        }}
        onConfirm={handleDelete}
        title="Delete application draft?"
        description="This removes the saved answers for this role. It cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete draft'}
        reasonRequired={false}
        tone="danger"
      />
    </>
  )
}
