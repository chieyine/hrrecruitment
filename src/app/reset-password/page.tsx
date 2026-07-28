'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // URL fragments are not sent in HTTP requests or Referer headers.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const fragmentToken = params.get('token')
    if (fragmentToken) {
      setToken((current) => current || fragmentToken)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('This reset link is missing its token. Please use the link from your email.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Password reset successful! You can now log in.')
      } else {
        setError(data.error || 'Password reset failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-md w-full mx-auto px-4 py-16 flex-1 flex flex-col justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Reset Your Password</h1>
            <p className="text-slate-600 text-sm mt-1">Enter your new password below.</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {message ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              {message}
              <div className="mt-4">
                <Link
                  href="/auth/login"
                  className="bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg inline-block text-sm"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs">
                  Open this page from the reset link in your email so your secure token is included.
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition"
              >
                {loading ? 'Updating password…' : 'Reset password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
