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
  minLength = 0,
  placeholder,
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
  /** Server-side minimums are mirrored here so the rejection happens before the round trip. */
  minLength?: number
  placeholder?: string
  tone?: 'default' | 'danger'
  busy?: boolean
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])

  const trimmed = reason.trim()
  const tooShort = minLength > 0 && trimmed.length > 0 && trimmed.length < minLength
  const missing = reasonRequired && trimmed.length === 0
  const invalid = tooShort || missing
  const confirmClasses = tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-700 hover:bg-brand-800'

  return (
    <Dialog open={open} onClose={onClose} title={title} tone={tone}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setTouched(true)
          if (invalid) return
          await onConfirm(trimmed)
        }}
        className="space-y-4"
        noValidate
      >
        {description && <p className="text-sm leading-6 text-stone-600">{description}</p>}
        <div>
          <label htmlFor="dialog-reason" className="field-label">
            {reasonLabel}
            {reasonRequired ? ' *' : ' (optional)'}
          </label>
          <textarea
            id="dialog-reason"
            rows={3}
            value={reason}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && invalid}
            aria-describedby="dialog-reason-help"
            className="field-control min-h-24 resize-y"
          />
          <p
            id="dialog-reason-help"
            className={`mt-1 text-xs ${touched && invalid ? 'font-medium text-rose-700' : 'text-stone-500'}`}
            role={touched && invalid ? 'alert' : undefined}
          >
            {missing && touched
              ? 'A reason is required.'
              : minLength > 0
                ? `${trimmed.length} of ${minLength} characters minimum.`
                : ''}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4 py-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || invalid}
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
