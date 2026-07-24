'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<{ toast: (kind: ToastKind, message: string) => void }>({
  toast: () => {},
})

/** useToast().toast('success' | 'error' | 'info', message) */
export function useToast() {
  return useContext(ToastContext)
}

const STYLES: Record<ToastKind, { box: string; icon: typeof CheckCircle2 }> = {
  success: { box: 'border-emerald-200 bg-white text-emerald-800', icon: CheckCircle2 },
  error: { box: 'border-rose-200 bg-white text-rose-800', icon: AlertCircle },
  info: { box: 'border-blue-200 bg-white text-blue-800', icon: Info },
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++
      setToasts((t) => [...t.slice(-3), { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4500)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Live region: polite for success/info; errors use role=alert per item */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const S = STYLES[t.kind]
          const Icon = S.icon
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border ${S.box} p-3.5 pr-2.5 shadow-lg shadow-slate-900/5 animate-toast-in`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
