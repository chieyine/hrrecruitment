'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { Mail, Lock, Phone, User, AlertCircle, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [legalFirstName, setLegalFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalFirstName,
          lastName,
          email,
          phone,
          password,
          privacyAccepted,
          termsAccepted,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      router.push('/candidate/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />

      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-5xl border border-[#d9d4ca] bg-[#fbfaf7] lg:grid-cols-[300px_1fr]">
          <aside className="bg-brand-900 p-8 text-white sm:p-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">
              Your candidate account
            </span>
            <h1 className="mt-6 font-display text-4xl leading-tight">Start with the details we can reuse.</h1>
            <p className="mt-5 text-sm leading-6 text-brand-100">
              Use your legal name here. You can add a preferred name after signing in.
            </p>
            <p className="mt-10 border-t border-brand-700 pt-5 text-xs leading-5 text-brand-200">
              Keep this account for this application and any future FRAD roles.
            </p>
          </aside>
          <section className="p-6 sm:p-10">
            <div>
              <h2 className="font-display text-3xl text-[#17211c]">Create your account</h2>
              <p className="mt-2 text-xs text-[#617067]">All fields marked as required must be completed.</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-center gap-2 border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="register-first-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Legal first name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="register-first-name"
                      type="text"
                      required
                      value={legalFirstName}
                      onChange={(e) => setLegalFirstName(e.target.value)}
                      placeholder="Aminu"
                      className="field-control pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-last-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Last name
                  </label>
                  <input
                    id="register-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Bello"
                    className="field-control"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="field-control pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone number <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="field-control pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="register-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="field-control pl-10"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Use at least 8 characters with a letter and a number.
                </p>
              </div>

              <div className="space-y-3 border-t border-stone-200 pt-5">
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-700">
                  <input
                    required
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-brand-700"
                  />
                  <span>
                    I have read the{' '}
                    <Link href="/privacy" className="font-bold text-brand-800 hover:underline">
                      privacy notice
                    </Link>{' '}
                    and agree to FRAD using my information for recruitment.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-700">
                  <input
                    required
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-brand-700"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" className="font-bold text-brand-800 hover:underline">
                      terms of use
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary mt-2 h-12 w-full">
                {loading ? 'Creating account…' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-bold text-brand-800 hover:underline">
                Sign in
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
