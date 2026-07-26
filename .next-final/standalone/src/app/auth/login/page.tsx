'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { hasStaffRole, isCandidateOnly } from '@/lib/roles'

const SSO_ERROR_MESSAGES: Record<string, string> = {
  sso_failed: 'Staff single sign-on could not be completed. Please try again or sign in with your password.',
  sso_unavailable: 'Staff single sign-on is currently unavailable. Please sign in with your password.',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nextPath, setNextPath] = useState('')
  // Set once the password is accepted but a second factor is still required.
  const [challengeToken, setChallengeToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Only render text this application controls. Echoing the raw query value
    // let an attacker put arbitrary (e.g. phishing) copy inside the error box.
    const ssoError = params.get('error')
    if (ssoError) setError(SSO_ERROR_MESSAGES[ssoError] ?? SSO_ERROR_MESSAGES.sso_failed)
    const requested = params.get('next')
    if (requested?.startsWith('/') && !requested.startsWith('//')) setNextPath(requested)
  }, [])

  const goHome = (roles: string[]) => {
    const candidateOnly = isCandidateOnly(roles)
    const staff = hasStaffRole(roles)
    const staffHome = roles.length === 1 && roles.includes('PANEL_MEMBER')
      ? '/recruitment/interviews'
      : roles.includes('APPROVER') && !roles.includes('HR_MANAGER')
        ? '/recruitment/approvals'
        : roles.includes('COURSE_ADMIN') && !roles.includes('SYSTEM_ADMIN')
          ? '/admin/courses'
          : '/recruitment/work'
    router.push(nextPath || (candidateOnly ? '/candidate/dashboard' : staff ? staffHome : '/careers'))
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Correct password, but the account has a second factor: no session yet.
      if (data.mfaRequired) {
        setChallengeToken(data.challengeToken)
        setPassword('')
        setLoading(false)
        return
      }

      goHome(data.user.roles as string[])
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: mfaCode }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'That code is not valid')
        // An expired challenge cannot be retried; send the user back to step one.
        if (response.status === 401 && /expired/i.test(data.error || '')) {
          setChallengeToken('')
          setMfaCode('')
        }
        setLoading(false)
        return
      }
      if (typeof data.recoveryCodesRemaining === 'number' && data.recoveryCodesRemaining <= 2) {
        // Surfaced on the destination page via the toast provider would be
        // nicer, but a signed-in user will also see this in account settings.
        console.warn('Few MFA recovery codes remain')
      }
      goHome(data.user.roles as string[])
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />

      <main id="main-content" className="flex-1">
        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl lg:grid-cols-[.9fr_1.1fr]">
          <section className="hidden bg-brand-900 px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-200">Secure candidate services</span>
              <h1 className="mt-8 max-w-md font-display text-5xl leading-[1.05] tracking-[-0.035em]">
                Your applications, in one place.
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-brand-100">
                Sign in to respond to interviews, review offers and complete actions requested by the recruitment team.
              </p>
            </div>
            <div className="border-t border-brand-700 pt-6 text-xs leading-5 text-brand-200">
              FRAD never asks candidates to pay a fee at any stage of recruitment.
            </div>
          </section>

          <section className="flex items-center px-4 py-12 sm:px-10 lg:px-20">
            <div className="mx-auto w-full max-w-md">
              <span className="editorial-kicker">Candidate and staff access</span>
              <h2 className="editorial-title mt-5 text-4xl text-navy-900">
                {challengeToken ? 'Two-step verification' : 'Sign in'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {challengeToken
                  ? 'Enter the six-digit code from your authenticator app, or one of your recovery codes.'
                  : 'Use the email address linked to your candidate account.'}
              </p>

              {error && (
                <div role="alert" className="mt-6 flex items-center gap-3 border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {challengeToken ? (
                <form className="mt-8 space-y-5" onSubmit={handleMfaSubmit}>
                  <div>
                    <label htmlFor="login-mfa-code" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      Authentication code
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                      <input
                        id="login-mfa-code"
                        inputMode="text"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        value={mfaCode}
                        onChange={(event) => setMfaCode(event.target.value)}
                        placeholder="000000"
                        className="h-12 w-full rounded-xl border border-surface-200 bg-white pl-10 pr-4 font-mono text-sm tracking-widest text-navy-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      Lost your phone? Enter a recovery code instead. Each one works once.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || mfaCode.trim().length < 6}
                    className="btn-primary h-12 w-full justify-center text-sm disabled:opacity-60"
                  >
                    {loading ? 'Verifying…' : 'Verify and sign in'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setChallengeToken(''); setMfaCode(''); setError('') }}
                    className="w-full text-center text-xs font-semibold text-muted underline"
                  >
                    Start again
                  </button>
                </form>
              ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="h-12 w-full rounded-xl border border-surface-200 bg-white pl-10 pr-4 text-sm text-navy-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-surface-200 bg-white pl-10 pr-4 text-sm text-navy-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-xs font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-600">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex h-12 w-full disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <span className="h-px flex-1 bg-surface-200" />FRAD staff<span className="h-px flex-1 bg-surface-200" />
                </div>
                <a href="/api/auth/sso/start" className="btn-secondary flex h-12 w-full">
                  <ShieldCheck className="mr-2 h-4 w-4 text-brand-700" />Continue with FRAD SSO
                </a>
              </form>
              )}

              <div className="mt-7 border-t border-surface-200 pt-6 text-sm text-muted">
                New candidate?{' '}
                <Link href="/auth/register" className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-600">
                  Create an account
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
