'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, KeyRound, Loader2, Monitor, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

/**
 * Self-service account security: two-factor enrolment, recovery codes, and the
 * list of signed-in devices.
 *
 * Deliberately one component covering both, because they are the same
 * decision for a user ("is my account safe?") and both need the same
 * password-confirmation and re-fetch behaviour.
 */

interface MfaStatus {
  enabled: boolean
  enabledAt: string | null
  enrolmentPending: boolean
  recoveryCodesRemaining: number
}

interface SessionRow {
  tokenId: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  current: boolean
}

interface Enrolment {
  secret: string
  otpauthUri: string
  qrSvg: string
}

/** Turn a raw user-agent into something a person can recognise. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : 'Browser'
  const platform = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Unknown platform'
  return `${browser} on ${platform}`
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SecuritySettings() {
  const { toast } = useToast()
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [mfaResponse, sessionResponse] = await Promise.all([fetch('/api/auth/mfa'), fetch('/api/auth/sessions')])
    if (mfaResponse.ok) setStatus(await mfaResponse.json())
    if (sessionResponse.ok) setSessions((await sessionResponse.json()).sessions ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const call = async (input: RequestInfo, init: RequestInit, label: string) => {
    setBusy(label)
    try {
      const response = await fetch(input, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast('error', data.error || 'That did not work. Please try again.')
        return null
      }
      return data
    } finally {
      setBusy(null)
    }
  }

  const begin = async () => {
    const data = await call('/api/auth/mfa', { method: 'POST', body: JSON.stringify({ action: 'begin' }) }, 'begin')
    if (data) {
      setEnrolment(data)
      setRecoveryCodes(null)
    }
  }

  const confirm = async () => {
    const data = await call(
      '/api/auth/mfa',
      { method: 'POST', body: JSON.stringify({ action: 'confirm', code }) },
      'confirm'
    )
    if (data) {
      setEnrolment(null)
      setCode('')
      setRecoveryCodes(data.recoveryCodes)
      toast('success', 'Two-factor authentication is now active')
      await load()
    }
  }

  const regenerate = async () => {
    const data = await call(
      '/api/auth/mfa',
      { method: 'POST', body: JSON.stringify({ action: 'regenerate-recovery-codes', code }) },
      'regenerate'
    )
    if (data) {
      setCode('')
      setRecoveryCodes(data.recoveryCodes)
      toast('success', 'New recovery codes issued. The old ones no longer work.')
      await load()
    }
  }

  const disable = async () => {
    const data = await call('/api/auth/mfa', { method: 'DELETE', body: JSON.stringify({ password }) }, 'disable')
    if (data) {
      setPassword('')
      setRecoveryCodes(null)
      toast('success', 'Two-factor authentication disabled')
      await load()
    }
  }

  const revoke = async (tokenId: string) => {
    const data = await call('/api/auth/sessions', { method: 'DELETE', body: JSON.stringify({ tokenId }) }, tokenId)
    if (data) {
      toast('success', 'That device has been signed out')
      await load()
    }
  }

  const revokeOthers = async () => {
    const data = await call(
      '/api/auth/sessions',
      { method: 'DELETE', body: JSON.stringify({ allOthers: true }) },
      'others'
    )
    if (data) {
      toast('success', `Signed out ${data.revoked} other device${data.revoked === 1 ? '' : 's'}`)
      await load()
    }
  }

  const spinner = (label: string) => busy === label && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />

  return (
    <>
      <section className="section-panel" aria-labelledby="mfa-heading">
        <div className="section-heading">
          <div>
            <h2 id="mfa-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950">
              {status?.enabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
              ) : (
                <ShieldOff className="h-5 w-5 text-amber-700" />
              )}
              Two-factor authentication
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              A code from your phone in addition to your password. Strongly recommended, and required for staff accounts
              with access to candidate records.
            </p>
          </div>
          <span
            className={`status-chip ${status?.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          >
            {status === null ? 'Checking…' : status.enabled ? 'Active' : 'Not set up'}
          </span>
        </div>

        {status?.enabled && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-700">
              Active since {status.enabledAt ? formatWhen(status.enabledAt) : 'recently'}.{' '}
              <strong>{status.recoveryCodesRemaining}</strong> unused recovery code
              {status.recoveryCodesRemaining === 1 ? '' : 's'} remaining.
            </p>
            {status.recoveryCodesRemaining <= 2 && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                You are nearly out of recovery codes. Generate a new set so you can still sign in if you lose your
                phone.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900">New recovery codes</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Enter a current code from your app. This replaces all existing codes.
                </p>
                <label
                  htmlFor="mfa-regen-code"
                  className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Authenticator code
                </label>
                <input
                  id="mfa-regen-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm tracking-widest"
                  placeholder="000000"
                />
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={code.trim().length < 6 || busy !== null}
                  className="btn-secondary mt-3 inline-flex items-center gap-2 text-xs disabled:opacity-50"
                >
                  {spinner('regenerate')}
                  <KeyRound className="h-4 w-4" aria-hidden /> Generate new codes
                </button>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <h3 className="text-sm font-bold text-slate-900">Turn off two-factor</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Confirm your password. This makes your account less secure.
                </p>
                <label
                  htmlFor="mfa-password"
                  className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Current password
                </label>
                <input
                  id="mfa-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={disable}
                  disabled={!password || busy !== null}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {spinner('disable')}Turn off
                </button>
              </div>
            </div>
          </div>
        )}

        {!status?.enabled && !enrolment && (
          <button
            type="button"
            onClick={begin}
            disabled={busy !== null}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {spinner('begin')}
            <ShieldCheck className="h-4 w-4" aria-hidden /> Set up two-factor authentication
          </button>
        )}

        {enrolment && (
          <div className="space-y-4">
            <ol className="space-y-3 text-sm text-slate-700">
              <li>
                <strong>1.</strong> Scan this code with an authenticator app (Google Authenticator, Microsoft
                Authenticator, 1Password, Authy — any of them).
              </li>
              <li>
                <div
                  className="inline-block rounded-xl border border-slate-300 bg-white p-3"
                  // The SVG is generated server-side by lib/qr from a URI this
                  // application built; no user-supplied markup reaches it.
                  dangerouslySetInnerHTML={{ __html: enrolment.qrSvg }}
                />
                <p className="mt-2 text-xs text-slate-600">
                  Cannot scan? Enter this key manually:
                  <br />
                  <code className="mt-1 inline-block break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs tracking-wider">
                    {enrolment.secret}
                  </code>
                </p>
              </li>
              <li>
                <strong>2.</strong> Enter the six-digit code your app shows.
              </li>
            </ol>
            <div className="max-w-xs">
              <label
                htmlFor="mfa-confirm-code"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Authenticator code
              </label>
              <input
                id="mfa-confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm tracking-widest"
                placeholder="000000"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirm}
                disabled={code.trim().length < 6 || busy !== null}
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {spinner('confirm')}Confirm and activate
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrolment(null)
                  setCode('')
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {recoveryCodes && (
          <div role="alert" className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-amber-900">Save these recovery codes now</h3>
            <p className="mt-1 text-xs text-amber-900">
              Each one works once, if you lose access to your authenticator app. This is the only time they are shown.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-3">
              {recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode} className="rounded bg-white px-2 py-1 text-center tracking-wider text-slate-900">
                  {recoveryCode}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(recoveryCodes.join('\n'))
                  toast('success', 'Recovery codes copied')
                }}
                className="btn-secondary text-xs"
              >
                Copy all
              </button>
              <button type="button" onClick={() => setRecoveryCodes(null)} className="btn-secondary text-xs">
                I have saved them
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="section-panel" aria-labelledby="sessions-heading">
        <div className="section-heading">
          <div>
            <h2 id="sessions-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Monitor className="h-5 w-5 text-brand-700" /> Where you are signed in
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sign out a device you no longer recognise. Signing out one device does not affect the others.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={busy !== null}
              className="btn-secondary inline-flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {spinner('others')}Sign out all other devices
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">No active sessions found.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <li key={session.tokenId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">
                    {describeDevice(session.userAgent)}
                    {session.current && (
                      <span className="ml-2 status-chip bg-brand-50 text-brand-800">This device</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Last active {formatWhen(session.lastSeenAt)}
                    {session.ipAddress && session.ipAddress !== 'unknown' ? ` · ${session.ipAddress}` : ''}
                  </p>
                </div>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() => revoke(session.tokenId)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                  >
                    {spinner(session.tokenId)}Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
