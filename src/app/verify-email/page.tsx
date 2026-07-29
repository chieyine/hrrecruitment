'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { AlertCircle, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react'

type VerificationState = 'checking' | 'missing' | 'failed' | 'complete'

export default function VerifyEmailPage() {
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Checking verification link…')
  const [nextPath, setNextPath] = useState('')

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const requested = query.get('next')
    const safeNext = requested?.startsWith('/') && !requested.startsWith('//') ? requested : ''
    setNextPath(safeNext)

    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    if (!token) {
      setState('missing')
      setMessage('Open the full verification link from your email.')
      return
    }

    const controller = new AbortController()
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          setState('failed')
          setMessage(data.error || 'This verification link is invalid or has expired.')
          return
        }
        setState('complete')
        setMessage('Your email address has been verified.')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState('failed')
        setMessage('We could not verify the address. Please try the link again.')
      })

    return () => controller.abort()
  }, [])

  const loginHref = nextPath ? `/auth/login?${new URLSearchParams({ next: nextPath }).toString()}` : '/auth/login'
  const recoveryHref = nextPath
    ? `/auth/register?${new URLSearchParams({ next: nextPath }).toString()}`
    : '/auth/register'

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />
      <main id="main-content" className="flex flex-1 items-center px-4 py-12 sm:px-6">
        <section className="mx-auto w-full max-w-xl border-t-4 border-brand-800 bg-[#fbfaf7] p-7 shadow-soft sm:p-12">
          {state === 'checking' ? (
            <>
              <MailCheck className="h-10 w-10 text-brand-700" />
              <h1 className="mt-7 font-display text-3xl text-[#17211c]">Verifying your email</h1>
              <p role="status" className="mt-4 text-sm leading-6 text-[#617067]">
                {message}
              </p>
            </>
          ) : state === 'complete' ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-brand-700" />
              <span className="mt-7 block text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                Email verified
              </span>
              <h1 className="mt-3 font-display text-3xl text-[#17211c]">Your account is ready</h1>
              <p role="status" className="mt-4 text-sm leading-6 text-[#526159]">
                {message} Sign in to continue.
              </p>
              <Link href={loginHref} className="btn-primary mt-8 h-12 justify-center sm:w-fit">
                Continue to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <AlertCircle className="h-10 w-10 text-amber-700" />
              <h1 className="mt-7 font-display text-3xl text-[#17211c]">
                {state === 'missing' ? 'Verification link incomplete' : 'Email not verified'}
              </h1>
              <p role="alert" className="mt-4 text-sm leading-6 text-[#526159]">
                {message}
              </p>
              <p className="mt-3 text-xs leading-5 text-[#617067]">
                You can request another verification email by entering your account details again. Existing account
                information will not be replaced.
              </p>
              <Link href={recoveryHref} className="btn-primary mt-8 h-12 justify-center sm:w-fit">
                Request another email
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
