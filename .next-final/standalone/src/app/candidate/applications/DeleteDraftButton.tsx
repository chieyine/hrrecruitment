'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function DeleteDraftButton({ applicationId, vacancyId }: { applicationId: string, vacancyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/candidate/applications/${applicationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        localStorage.removeItem(`frad-application-draft:${vacancyId}`)
        setOpen(false)
        router.refresh()
      } else {
        alert('Failed to delete draft.')
      }
    } catch {
      alert('An error occurred while deleting the draft.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button 
        type="button" 
        onClick={() => setOpen(true)}
        className="font-bold text-rose-700 hover:underline flex items-center gap-1"
        aria-label="Delete draft"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete draft
      </button>
      
      <ReasonDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete application draft?"
        description="Are you sure you want to permanently delete this application draft? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete draft"}
        reasonRequired={false}
        tone="danger"
      />
    </>
  )
}
