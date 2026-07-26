'use client'

import { useState } from 'react'
import { Phone, Mail, Download, UserX, ShieldOff, Users } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog, Dialog } from '@/components/ui/Dialog'

export default function AccountSettingsActions({ talentPoolConsent }: { talentPoolConsent: boolean }) {
  const { toast } = useToast()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [closing, setClosing] = useState(false)
  const [withdrawingConsent, setWithdrawingConsent] = useState(false)
  const [poolConsent, setPoolConsent] = useState(talentPoolConsent)

  const act = async (payload: any) => {
    const r = await fetch('/api/candidate/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await r.json()
    if (r.ok) {
      toast('success', d.message || (payload.action === 'CHANGE_EMAIL' ? 'Verification sent to the new email.' : 'Request saved.'))
      setClosing(false)
      setWithdrawingConsent(false)
      if (payload.action === 'SET_TALENT_POOL_CONSENT') setPoolConsent(payload.decision)
    } else {
      toast('error', d.error || 'Failed')
    }
  }

  return (
    <div className="section-panel space-y-7">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Contact details</h2>
        <p className="mt-1 text-sm text-slate-600">We use these details for active applications. A new email address must be verified before it replaces the current one.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-phone" className="field-label">
            Phone number
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="acc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="field-control" />
            <button type="button" onClick={() => act({ action: 'UPDATE_PHONE', phone })} className="btn-primary shrink-0">
              <Phone className="h-4 w-4" /> Save
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="acc-email" className="field-label">
            New email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="field-control" />
            <button type="button" onClick={() => act({ action: 'CHANGE_EMAIL', email })} className="btn-primary shrink-0">
              <Mail className="h-4 w-4" /> Send verification
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-950">Optional vacancy alerts</h2>
        <p className="mt-1 text-sm text-slate-600">This choice does not affect applications you have already made.</p>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={poolConsent}
            onChange={(event) => act({ action: 'SET_TALENT_POOL_CONSENT', decision: event.target.checked })}
            className="mt-4 h-4 w-4 rounded border-slate-300"
          />
          <span className="mt-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Users className="h-4 w-4" /> Tell me about suitable future roles</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600">Recruitment staff may keep your profile in the talent pool and contact you when a relevant vacancy opens. You can turn this off at any time.</span>
          </span>
        </label>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-950">Your privacy choices</h2>
        <p className="mt-1 text-sm text-slate-600">Download a copy of your information or ask us to review the data we hold.</p>
        <div className="mt-4 flex flex-wrap gap-3">
        <a href="/api/candidate/privacy/export" className="btn-secondary">
          <Download className="h-4 w-4" /> Download my data
        </a>
        <button type="button" onClick={() => setClosing(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50">
          <UserX className="h-4 w-4" /> Request account closure
        </button>
        <button type="button" onClick={() => setWithdrawingConsent(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50">
          <ShieldOff className="h-4 w-4" /> Withdraw recruitment consent
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

      <Dialog open={withdrawingConsent} onClose={() => setWithdrawingConsent(false)} title="Withdraw privacy consent" tone="danger">
        <p className="text-sm text-slate-600">
          Withdrawing privacy consent prevents continued recruitment processing and creates a data
          review request. Do you want to continue?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setWithdrawingConsent(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => act({ action: 'WITHDRAW_CONSENT', consentType: 'PRIVACY_NOTICE' })} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            Withdraw consent
          </button>
        </div>
      </Dialog>
    </div>
  )
}
