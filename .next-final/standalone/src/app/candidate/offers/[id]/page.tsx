'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, ArrowLeft, Download } from 'lucide-react'

export default function CandidateOfferPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()

  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/candidate/offers/${params.id}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load offer')
        if (active) setOffer(json.offer)
      })
      .catch((e) => active && setLoadError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [params.id])

  const [signatureName, setSignatureName] = useState('')
  const [comment, setComment] = useState('')
  const [proposedStartDate, setProposedStartDate] = useState('')
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
  const [signedCopy, setSignedCopy] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const handleRespond = async (action: 'ACCEPT' | 'DECLINE' | 'CLARIFY') => {
    setErrMsg('')
    if (action === 'ACCEPT' && !signatureName.trim()) {
      setErrMsg('Please type your full legal name as your digital signature to accept the offer.')
      return
    }

    setSubmitting(true)
    try {
      let signedFileId: string | undefined
      if (action === 'ACCEPT' && signedCopy) {
        const form = new FormData()
        form.set('file', signedCopy)
        form.set('sensitivityClass', 'CONFIDENTIAL')
        const upload = await fetch('/api/assets/upload', { method: 'POST', body: form })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.error || 'Signed-copy upload failed')
        signedFileId = uploaded.fileAssetId
      }
      const res = await fetch(`/api/candidate/offers/${params.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(action !== 'CLARIFY' ? { 'Idempotency-Key': `offer:${params.id}:${action}` } : {}) },
        body: JSON.stringify({ action, signatureName: action === 'ACCEPT' ? signatureName : undefined, candidateComment: comment, signedFileId, proposedStartDate: action === 'CLARIFY' && proposedStartDate ? proposedStartDate : undefined }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Offer response failed')

      if (action === 'ACCEPT') {
        setMsg('Congratulations! Offer accepted. Your preboarding package and clearance checklist have been activated.')
        setTimeout(() => router.push('/candidate/preboarding'), 2000)
      } else if (action === 'CLARIFY') {
        setMsg('Your clarification or proposed start date has been sent to HR. The offer remains open.')
      } else {
        setMsg('Offer response recorded. Thank you for your feedback.')
      }
    } catch (error) {
      setErrMsg(error instanceof Error ? error.message : 'Offer response failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500 font-semibold">Loading your offer…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (loadError || !offer) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-rose-700">{loadError || 'Offer not found.'}</p>
            <Link href="/candidate/offers" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
              Back to offers
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {msg && (
            <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}
          {errMsg && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800">
              {errMsg}
            </div>
          )}

          {/* Offer Letter Container */}
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Official Offer of Employment
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{offer.position}</h1>
                <p className="text-xs text-slate-500">FRAD Human Resources • {offer.dutyStation}</p>
              </div>

              <div className="text-xs text-right text-slate-500">
                <span>Acceptance Deadline:</span>
                <span className="block font-bold text-rose-600">{formatDate(offer.acceptanceDeadline)}</span>
                {offer.offerFileId && <a href={`/api/assets/download/${offer.offerFileId}`} className="mt-2 inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"><Download className="h-3.5 w-3.5" /> Download offer PDF</a>}
              </div>
            </div>

            {/* Offer Terms Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="block text-slate-400">Position Title</span>
                <span className="font-bold text-slate-900">{offer.position}</span>
              </div>

              <div>
                <span className="block text-slate-400">Duty Station</span>
                <span className="font-bold text-slate-900">{offer.dutyStation}</span>
              </div>

              <div>
                <span className="block text-slate-400">Contract Type</span>
                <span className="font-bold text-slate-900">{offer.contractType}</span>
              </div>

              <div>
                <span className="block text-slate-400">Approved compensation</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{offer.salary}</span>
              </div>

              <div>
                <span className="block text-slate-400">Proposed Start Date</span>
                <span className="font-bold text-slate-900">{formatDate(offer.startDate)}</span>
              </div>

              <div>
                <span className="block text-slate-400">Probationary Period</span>
                <span className="font-bold text-slate-900">{offer.probationPeriod || 'Not specified'}</span>
              </div>
              {offer.contractDuration && <div><span className="block text-slate-400">Contract duration</span><span className="font-bold text-slate-900">{offer.contractDuration}</span></div>}
              {offer.endDate && <div><span className="block text-slate-400">Contract end date</span><span className="font-bold text-slate-900">{formatDate(offer.endDate)}</span></div>}
              {offer.reportingLine && <div><span className="block text-slate-400">Reports to</span><span className="font-bold text-slate-900">{offer.reportingLine}</span></div>}
            </div>

            {/* Offer Letter Text */}
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
              {String(offer.renderedBody || '').split('\n').filter(Boolean).map((paragraph: string, index: number) => <p key={index}>{paragraph}</p>)}
              {offer.conditions && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><strong className="block text-amber-900">Conditions of this offer</strong><p className="mt-1 whitespace-pre-line">{offer.conditions}</p></div>}
            </div>

            {/* Acceptance Signature Input */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Digital Offer Acceptance Signature
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Full Legal Name (Digital Signature) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Type your full legal name..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Comments / Counter Proposal (Optional)</label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Any notes regarding proposed start date or logistics..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="proposed-start-date" className="block font-bold text-slate-900 mb-1">Alternate proposed start date (Optional)</label>
                  <input id="proposed-start-date" type="date" min={minDate} value={proposedStartDate} onChange={(event) => setProposedStartDate(event.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="signed-offer-copy" className="block font-bold text-slate-900 mb-1">Signed offer PDF (Optional)</label>
                  <input id="signed-offer-copy" type="file" accept=".pdf,application/pdf" onChange={(event) => setSignedCopy(event.target.files?.[0] || null)} className="block w-full text-xs" />
                </div>
              </div>

              {['SENT','VIEWED'].includes(offer.status) ? <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleRespond('DECLINE')}
                  disabled={submitting}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Decline Offer
                </button>

                <button type="button" onClick={() => handleRespond('CLARIFY')} disabled={submitting || (!comment.trim() && !proposedStartDate)} className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-xs font-bold text-blue-700 disabled:opacity-50">Request clarification / propose date</button>

                <button
                  type="button"
                  onClick={() => handleRespond('ACCEPT')}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {submitting ? 'Processing...' : 'Accept Offer & Begin Preboarding'}
                </button>
              </div> : <p className="rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-700">This offer is {offer.status.toLowerCase().replace(/_/g, ' ')} and can no longer be changed.</p>}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
