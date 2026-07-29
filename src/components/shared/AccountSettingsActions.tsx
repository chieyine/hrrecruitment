'use client'

import { useState } from 'react'
import { Mail, Download, UserX, Users } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function AccountSettingsActions({ talentPoolConsent }: { talentPoolConsent: boolean }) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [closing, setClosing] = useState(false)
  const [poolConsent, setPoolConsent] = useState(talentPoolConsent)
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (payload: { action: string; [key: string]: unknown }) => {
    setBusy(payload.action)
    try {
      const response = await fetch('/api/candidate/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'That change could not be saved.')
      toast(
        'success',
        body.message ||
          (payload.action === 'CHANGE_EMAIL' ? 'Verification sent to the new email.' : 'Your choice was saved.')
      )
      setClosing(false)
      if (payload.action === 'CHANGE_EMAIL') setEmail('')
      if (payload.action === 'SET_TALENT_POOL_CONSENT') setPoolConsent(Boolean(payload.decision))
    } catch (reason) {
      toast('error', reason instanceof Error ? reason.message : 'That change could not be saved.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="section-panel space-y-7">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Email address</h2>
        <p className="mt-1 text-sm text-slate-600">
          A new address must be verified before FRAD sends application updates to it. Change your phone number under
          Personal details.
        </p>
      </div>

      <div className="max-w-xl">
        <label htmlFor="acc-email" className="field-label">
          New email address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="acc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="field-control"
          />
          <button
            type="button"
            onClick={() => act({ action: 'CHANGE_EMAIL', email })}
            disabled={!email.trim() || busy !== null}
            className="btn-primary shrink-0"
          >
            <Mail className="h-4 w-4" /> Send verification
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-950">Optional vacancy alerts</h2>
        <p className="mt-1 text-sm text-slate-600">This choice does not affect applications you have already made.</p>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={poolConsent}
            disabled={busy !== null}
            onChange={(event) => act({ action: 'SET_TALENT_POOL_CONSENT', decision: event.target.checked })}
            className="mt-4 h-4 w-4 rounded border-slate-300"
          />
          <span className="mt-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4" /> Tell me about suitable future roles
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600">
              Recruitment staff may keep your profile in the talent pool and contact you when a relevant vacancy opens.
              You can turn this off at any time.
            </span>
          </span>
        </label>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-950">Your privacy choices</h2>
        <p className="mt-1 text-sm text-slate-600">
          Download a copy of your information or ask us to review the data we hold.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/candidate/privacy/export" className="btn-secondary">
            <Download className="h-4 w-4" /> Download my data
          </a>
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"
          >
            <UserX className="h-4 w-4" /> Request account closure
          </button>
        </div>
      </div>

      <ReasonDialog
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={(reason: string) => act({ action: 'REQUEST_CLOSURE', reason })}
        title="Request account closure"
        description="An administrator reviews closure requests. Your recruitment records may be retained where legally required."
        confirmLabel="Request closure"
        reasonLabel="Why are you requesting closure?"
        reasonRequired
        tone="danger"
      />
    </div>
  )
}
