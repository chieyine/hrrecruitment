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
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">Candidate account</span>
            <h1 className="mt-6 font-display text-4xl leading-tight">Apply for a role at FRAD.</h1>
            <p className="mt-5 text-sm leading-6 text-brand-100">Enter your details as they appear on your official documents.</p>
            <p className="mt-10 border-t border-brand-700 pt-5 text-xs leading-5 text-brand-200">One account can be used for future FRAD applications.</p>
          </aside>
          <section className="p-6 sm:p-10">
            <div>
              <h2 className="font-display text-3xl text-[#17211c]">Create your account</h2>
              <p className="mt-2 text-xs text-[#617067]">All fields marked as required must be completed.</p>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex items-center gap-2 border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Legal First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={legalFirstName}
                    onChange={(e) => setLegalFirstName(e.target.value)}
                    placeholder="Aminu"
                    className="h-11 w-full border border-[#c9c3b8] bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Bello"
                  className="h-11 w-full border border-[#c9c3b8] bg-white px-3 text-sm text-slate-900 focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 w-full border border-[#c9c3b8] bg-white pl-10 pr-4 text-sm text-slate-900 focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700"><input required type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} /><span>I have read and consent to the <Link href="/privacy" className="font-bold text-brand-800">privacy notice</Link>.</span></label>
            <label className="flex items-start gap-2 text-xs text-slate-700"><input required type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /><span>I agree to the <Link href="/terms" className="font-bold text-brand-800">terms of use</Link>.</span></label>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2348012345678"
                  className="h-11 w-full border border-[#c9c3b8] bg-white pl-10 pr-4 text-sm text-slate-900 focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 w-full border border-[#c9c3b8] bg-white pl-10 pr-4 text-sm text-slate-900 focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 bg-brand-800 text-sm font-bold text-white transition-colors hover:bg-brand-950 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
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
