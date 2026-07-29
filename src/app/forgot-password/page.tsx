'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextPath, setNextPath] = useState('')

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('next')
    if (requested?.startsWith('/') && !requested.startsWith('//')) setNextPath(requested)
  }, [])

  const loginHref = nextPath ? `/auth/login?${new URLSearchParams({ next: nextPath })}` : '/auth/login'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nextPath: nextPath || undefined }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Reset instructions could not be requested')
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reset instructions could not be requested')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />
      <main id="main-content" className="flex flex-1 items-center px-4 py-12 sm:px-6">
        <div className="mx-auto grid w-full max-w-4xl overflow-hidden border border-[#d9d4ca] bg-[#fbfaf7] lg:grid-cols-[280px_1fr]">
          <aside className="bg-brand-900 p-8 text-white sm:p-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">Account access</span>
            <h1 className="mt-6 font-display text-4xl leading-tight">Reset your password</h1>
            <p className="mt-5 text-sm leading-6 text-brand-100">
              We will send a one-time link to the email address on your account.
            </p>
            <p className="mt-10 border-t border-brand-700 pt-5 text-xs leading-5 text-brand-200">
              The link expires after one hour. FRAD will never ask you to send your password by email.
            </p>
          </aside>

          <section className="flex min-h-[460px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            {submitted ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-brand-700" />
                <span className="mt-7 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                  Request received
                </span>
                <h2 className="mt-3 font-display text-3xl text-[#17211c]">Check your email</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-[#526159]">
                  If an account exists for <strong className="font-semibold text-[#17211c]">{email}</strong>, we have
                  sent a password reset link. Check your spam folder if it does not arrive.
                </p>
                <Link href={loginHref} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-800">
                  <ArrowLeft className="h-4 w-4" />
                  Return to sign in
                </Link>
              </>
            ) : (
              <>
                <Mail className="h-8 w-8 text-brand-700" />
                <h2 className="mt-6 font-display text-3xl text-[#17211c]">Enter your email address</h2>
                <p className="mt-3 text-sm leading-6 text-[#617067]">
                  For security, we give the same response whether or not an account exists.
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mt-6 flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label htmlFor="recovery-email" className="mb-2 block text-xs font-semibold text-[#34443b]">
                      Email address
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="field-control"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary h-12 w-full justify-center">
                    {loading ? 'Sending link…' : 'Send reset link'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>

                <Link href={loginHref} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-brand-800">
                  <ArrowLeft className="h-4 w-4" />
                  Return to sign in
                </Link>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
