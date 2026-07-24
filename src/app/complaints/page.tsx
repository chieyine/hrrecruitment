'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Shield } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

const categoryHelp: Record<string, string> = {
  COMPLAINT: 'A concern about how your recruitment process was handled.',
  APPEAL: 'A request to review a recruitment decision where an appeal is permitted.',
  SAFEGUARDING: 'A concern about harm, exploitation, abuse or the safety of a child or adult.',
  FRAUD: 'Impersonation, a request for money or another dishonest recruitment approach.',
  ACCOMMODATION: 'A concern about a requested reasonable adjustment.',
  PRIVACY: 'A question or concern about the use of your personal information.',
  OTHER: 'A recruitment concern that does not fit the categories above.',
}

export default function ComplaintIntakePage() {
  const [category, setCategory] = useState('COMPLAINT')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, subject, description, reporterEmail: email || undefined }) })
    const body = await response.json()
    setBusy(false)
    if (response.ok) {
      setReference(body.referenceNumber)
      setSubject('')
      setDescription('')
    } else setMessage(body.error || 'We could not submit your concern. Check the form and try again.')
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-[280px_1fr]">
          <aside>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Confidential reporting</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Raise a recruitment concern</h1>
            <p className="mt-4 text-sm leading-6 text-stone-600">Tell us what happened in your own words. Your report goes to staff authorized to handle the category you choose.</p>
            <div className="mt-6 border-l-4 border-brand-600 bg-brand-50 p-4">
              <Shield className="h-5 w-5 text-brand-700" />
              <p className="mt-2 text-sm font-bold text-stone-900">You can report without an account</p>
              <p className="mt-1 text-xs leading-5 text-stone-600">An email address is optional. If you leave it blank, keep the reference number shown after submission.</p>
            </div>
            <p className="mt-6 text-xs leading-5 text-stone-500">If someone asked you to pay for a job, use the <Link href="/report-fraud" className="font-semibold text-brand-800 underline">fraud report</Link>.</p>
          </aside>

          <section className="section-panel p-5 sm:p-8">
            {reference ? (
              <div role="status" className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
                <h2 className="mt-4 text-2xl font-bold text-stone-950">Your concern has been received.</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">Keep this reference if you need to contact FRAD about the report.</p>
                <p className="mx-auto mt-5 w-fit border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-sm font-bold text-stone-900">{reference}</p>
                <button type="button" onClick={() => setReference('')} className="btn-secondary mt-6">Submit another concern</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label htmlFor="concern-category" className="field-label">What is this about?</label>
                  <select id="concern-category" value={category} onChange={(event) => setCategory(event.target.value)} className="field-control">
                    <option value="COMPLAINT">Complaint about the process</option>
                    <option value="APPEAL">Appeal</option>
                    <option value="SAFEGUARDING">Safeguarding concern</option>
                    <option value="FRAUD">Suspected fraud</option>
                    <option value="ACCOMMODATION">Reasonable adjustment</option>
                    <option value="PRIVACY">Privacy or personal information</option>
                    <option value="OTHER">Something else</option>
                  </select>
                  <p className="field-help">{categoryHelp[category]}</p>
                </div>
                <div>
                  <label htmlFor="concern-email" className="field-label">Contact email <span className="font-normal text-stone-500">(optional)</span></label>
                  <input id="concern-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field-control" />
                  <p className="field-help">Provide this only if you want the review team to contact you.</p>
                </div>
                <div>
                  <label htmlFor="concern-subject" className="field-label">Short summary</label>
                  <input id="concern-subject" required minLength={5} value={subject} onChange={(event) => setSubject(event.target.value)} className="field-control" />
                </div>
                <div>
                  <label htmlFor="concern-details" className="field-label">What happened?</label>
                  <textarea id="concern-details" required minLength={20} rows={8} value={description} onChange={(event) => setDescription(event.target.value)} className="field-control" placeholder="Include dates, names or vacancy references if you know them." />
                  <p className="field-help">Do not include your password, bank PIN or sign-in codes.</p>
                </div>
                {message && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}
                <button disabled={busy} className="btn-primary">{busy ? 'Submitting…' : 'Submit concern'}</button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
