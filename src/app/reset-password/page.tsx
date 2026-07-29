'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [nextPath, setNextPath] = useState('')
  const [linkRead, setLinkRead] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const requested = query.get('next')
    if (requested?.startsWith('/') && !requested.startsWith('//')) setNextPath(requested)

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    setToken(fragment.get('token') || '')
    setLinkRead(true)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }, [])

  const withNextPath = (path: string) =>
    nextPath ? `${path}?${new URLSearchParams({ next: nextPath }).toString()}` : path

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'The password could not be changed.')
        return
      }
      setComplete(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('The password could not be changed. Please try again.')
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
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">Account security</span>
            <h1 className="mt-6 font-display text-4xl leading-tight">Choose a new password</h1>
            <p className="mt-5 text-sm leading-6 text-brand-100">
              Use a password that you do not use for another account.
            </p>
            <p className="mt-10 border-t border-brand-700 pt-5 text-xs leading-5 text-brand-200">
              Changing your password signs your account out on other devices.
            </p>
          </aside>

          <section className="flex min-h-[500px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            {!linkRead ? (
              <p role="status" className="text-sm text-[#617067]">
                Checking reset link…
              </p>
            ) : !token ? (
              <>
                <AlertCircle className="h-10 w-10 text-amber-700" />
                <h2 className="mt-6 font-display text-3xl text-[#17211c]">This reset link is incomplete</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-[#526159]">
                  Open the full link from your reset email. If the link has expired or has already been used, request
                  another one.
                </p>
                <Link href={withNextPath('/forgot-password')} className="btn-primary mt-8 h-12 justify-center sm:w-fit">
                  Request another link
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : complete ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-brand-700" />
                <span className="mt-7 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                  Password changed
                </span>
                <h2 className="mt-3 font-display text-3xl text-[#17211c]">Sign in again</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-[#526159]">
                  Your previous sessions have been closed. Use the new password to continue.
                </p>
                <Link href={withNextPath('/auth/login')} className="btn-primary mt-8 h-12 justify-center sm:w-fit">
                  Continue to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <LockKeyhole className="h-9 w-9 text-brand-700" />
                <h2 className="mt-6 font-display text-3xl text-[#17211c]">Set your password</h2>
                <p className="mt-3 text-sm leading-6 text-[#617067]">
                  Use at least 8 characters, including a letter and a number.
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
                    <label htmlFor="new-password" className="mb-2 block text-xs font-semibold text-[#34443b]">
                      New password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="field-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold text-[#34443b]">
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="field-control"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary h-12 w-full justify-center">
                    {loading ? 'Changing password…' : 'Change password'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>

                <Link
                  href={withNextPath('/auth/login')}
                  className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-brand-800"
                >
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
