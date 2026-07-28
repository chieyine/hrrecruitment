'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function VerifyEmail() {
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('Verifying your email…')
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
    setToken(value)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  useEffect(() => {
    if (!token) return
    if (!token) {
      setMessage('The verification token is missing.')
      return
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json()
        setOk(response.ok)
        setMessage(data.message || data.error || 'Verification failed.')
      })
      .catch(() => setMessage('Verification failed. Please request a new link.'))
  }, [token])
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
        <h1 className="text-xl font-bold text-slate-900">Email verification</h1>
        <p role="status" className={`mt-3 text-sm ${ok ? 'text-emerald-700' : 'text-slate-600'}`}>
          {message}
        </p>
        <Link
          href={ok ? '/candidate/dashboard' : '/auth/login'}
          className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Continue
        </Link>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return <VerifyEmail />
}
