'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'

/** Accessible modal: focus moves in on open and returns on close, Escape and
 *  backdrop-click dismiss, Tab is trapped inside. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  tone = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement
    // Focus the first focusable element in the panel.
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
    )
    first?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])'
          )
        ).filter((n) => !n.hasAttribute('disabled'))
        if (nodes.length === 0) return
        const firstNode = nodes[0]
        const lastNode = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === firstNode) {
          e.preventDefault()
          lastNode.focus()
        } else if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault()
          firstNode.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(10,16,13,.28)] animate-dialog-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className={`text-lg font-semibold tracking-[-0.015em] ${tone === 'danger' ? 'text-rose-700' : 'text-navy-900'}`}
          >
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Prompt-replacement: collects an optional or required reason then confirms. */
export function ReasonDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  reasonLabel = 'Reason',
  reasonRequired = false,
  tone = 'default',
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
  title: string
  description?: string
  confirmLabel?: string
  reasonLabel?: string
  reasonRequired?: boolean
  tone?: 'default' | 'danger'
  busy?: boolean
}) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const confirmClasses = tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-700 hover:bg-brand-800'

  return (
    <Dialog open={open} onClose={onClose} title={title} tone={tone}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onConfirm(reason.trim())
        }}
        className="space-y-4"
      >
        {description && <p className="text-sm leading-6 text-stone-600">{description}</p>}
        <div>
          <label htmlFor="dialog-reason" className="field-label">
            {reasonLabel}
            {reasonRequired ? ' *' : ' (optional)'}
          </label>
          <textarea
            id="dialog-reason"
            required={reasonRequired}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field-control min-h-24 resize-y"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4 py-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${confirmClasses}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'default',
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} tone={tone}>
      <p className="text-sm leading-6 text-stone-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4 py-2">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
            tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-700 hover:bg-brand-800'
          }`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
