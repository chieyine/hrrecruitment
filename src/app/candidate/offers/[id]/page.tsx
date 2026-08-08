'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileSignature, HelpCircle, ShieldCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ControlledDocumentViewer from '@/components/shared/ControlledDocumentViewer'
import { ReasonDialog } from '@/components/ui/Dialog'
import { PageIntro } from '@/components/ui/PageElements'
import { formatDate, formatDateTime, getStatusBadgeClass } from '@/lib/utils'

export default function CandidateOfferPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false)
  const [comment, setComment] = useState('')
  const [proposedStartDate, setProposedStartDate] = useState('')
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
  const [signedCopy, setSignedCopy] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/candidate/offers/${params.id}`)
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load your offer.')
        if (active) setOffer(body.offer)
      })
      .catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Could not load your offer.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [params.id])

  async function respond(action: 'ACCEPT' | 'DECLINE' | 'CLARIFY', responseComment = comment) {
    setErrorMessage('')
    if (action === 'ACCEPT' && ((!signatureName.trim() && !signedCopy) || !acceptedDeclaration)) {
      setErrorMessage('Read the offer, confirm the declaration, then sign online or attach the signed PDF.')
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
        if (!upload.ok) throw new Error(uploaded.error || 'The signed copy could not be uploaded.')
        signedFileId = uploaded.fileAssetId
      }
      const response = await fetch(`/api/candidate/offers/${params.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(action !== 'CLARIFY' ? { 'Idempotency-Key': `offer:${params.id}:${action}` } : {}),
        },
        body: JSON.stringify({
          action,
          signatureName: action === 'ACCEPT' ? signatureName.trim() : undefined,
          declarationAccepted: action === 'ACCEPT' ? acceptedDeclaration : undefined,
          candidateComment: responseComment,
          signedFileId,
          proposedStartDate: action === 'CLARIFY' && proposedStartDate ? proposedStartDate : undefined,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Your response could not be recorded.')

      if (action === 'ACCEPT') {
        setMessage('Offer accepted. Your before-you-start checklist is ready.')
        setOffer({ ...offer, status: 'ACCEPTED' })
      } else if (action === 'CLARIFY') {
        setMessage('Your question has been sent. The offer remains open while the recruitment team replies.')
        setComment('')
        setProposedStartDate('')
      } else {
        setMessage('Your decision has been recorded.')
        setOffer({ ...offer, status: 'DECLINED' })
        setDeclineOpen(false)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your response could not be recorded.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="grid flex-1 place-items-center">
          <p className="text-sm font-medium text-stone-500">Preparing your offer…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (loadError || !offer) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="grid flex-1 place-items-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-navy-900">We could not open this offer</h1>
            <p className="mt-2 text-sm text-stone-600">{loadError || 'The offer is unavailable.'}</p>
            <Link href="/candidate/applications" className="btn-secondary mt-5">
              Back to applications
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const openForResponse =
    ['SENT', 'VIEWED'].includes(offer.status) && new Date(offer.acceptanceDeadline).getTime() > Date.now()
  const displayStatus = ['SENT', 'VIEWED'].includes(offer.status) && !openForResponse ? 'EXPIRED' : String(offer.status)
  const offerReference = `FRAD-OFFER-${String(offer.id).slice(0, 8).toUpperCase()}`
  const terms = [
    ['Position', offer.position],
    ['Duty station', offer.dutyStation],
    ['Contract', [offer.contractType, offer.contractDuration].filter(Boolean).join(' · ')],
    ['Compensation', offer.salary],
    ['Start date', formatDate(offer.startDate)],
    ['End date', offer.endDate ? formatDate(offer.endDate) : null],
    ['Probation', offer.probationPeriod],
    ['Reports to', offer.reportingLine],
  ].filter((item) => item[1])

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-7xl space-y-6">
          <Link
            href="/candidate/applications"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Applications
          </Link>

          <PageIntro
            eyebrow="Your application"
            title="Offer"
            description={`${offer.position} · ${offer.dutyStation}`}
            actions={
              <div className="text-right">
                <span className={`status-chip ${getStatusBadgeClass(displayStatus)}`}>
                  {displayStatus
                    .replaceAll('_', ' ')
                    .toLowerCase()
                    .replace(/^./, (letter) => letter.toUpperCase())}
                </span>
                <p className="mt-2 text-xs font-semibold text-stone-500">
                  Respond by {formatDateTime(offer.acceptanceDeadline)}
                </p>
              </div>
            }
          />

          {message && (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <p className="font-semibold">{message}</p>
            </div>
          )}
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
            >
              {errorMessage}
            </p>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            {offer.offerFileId ? (
              <ControlledDocumentViewer
                fileId={offer.offerFileId}
                title={`Offer of employment — ${offer.position}`}
                reference={offerReference}
                issuedLabel={offer.sentAt ? `Issued ${formatDate(offer.sentAt)}` : undefined}
              />
            ) : (
              <section className="section-panel px-6 py-14 text-center">
                <FileSignature className="mx-auto h-8 w-8 text-brand-700" />
                <h2 className="mt-3 text-lg font-semibold text-navy-900">Your document is being prepared</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                  The recruitment team has not attached the final PDF yet. Contact them before recording a decision.
                </p>
              </section>
            )}

            <aside className="space-y-5 xl:sticky xl:top-24">
              <section className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 className="font-semibold text-navy-900">Offer at a glance</h2>
                    <p className="mt-1 text-xs text-stone-500">The signed PDF remains the formal record.</p>
                  </div>
                </div>
                <dl className="divide-y divide-stone-100 px-5">
                  {terms.map(([label, value]) => (
                    <div key={String(label)} className="py-3">
                      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-navy-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {openForResponse ? (
                <section className="section-panel p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                    <div>
                      <h2 className="font-semibold text-navy-900">Record your decision</h2>
                      <p className="mt-1 text-xs leading-5 text-stone-600">
                        Download and read the full PDF. You can sign online below, or sign the PDF and upload it. Your time, account and response are retained with the offer record.
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 flex items-start gap-3 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={acceptedDeclaration}
                      onChange={(event) => setAcceptedDeclaration(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300"
                    />
                    <span>I have read this offer and agree to its terms.</span>
                  </label>
                  <label className="mt-4 block">
                    <span className="field-label">Full legal name for online signature</span>
                    <input
                      value={signatureName}
                      onChange={(event) => setSignatureName(event.target.value)}
                      autoComplete="name"
                      className="field-control"
                      placeholder={offer.candidateName}
                    />
                  </label>

                  <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-stone-700">
                      Upload the signed PDF instead
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      Download the offer above, sign it, then attach the signed PDF here. If you use this option, typing your name above is optional.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) => setSignedCopy(event.target.files?.[0] || null)}
                      className="mt-3 block w-full text-xs"
                    />
                  </details>

                  <button
                    type="button"
                    onClick={() => void respond('ACCEPT')}
                    disabled={submitting || !offer.offerFileId || !acceptedDeclaration || (!signatureName.trim() && !signedCopy)}
                    className="btn-primary mt-5 w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? 'Recording…' : 'Accept offer'}
                  </button>

                  <div className="mt-5 border-t border-stone-200 pt-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                      <HelpCircle className="h-4 w-4 text-brand-700" /> Need clarification?
                    </h3>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Write your question"
                      className="field-control mt-3"
                    />
                    <label className="mt-3 block">
                      <span className="field-label">Alternative start date, if relevant</span>
                      <input
                        type="date"
                        min={minDate}
                        value={proposedStartDate}
                        onChange={(event) => setProposedStartDate(event.target.value)}
                        className="field-control"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void respond('CLARIFY')}
                      disabled={submitting || (!comment.trim() && !proposedStartDate)}
                      className="btn-secondary mt-3 w-full"
                    >
                      Send question
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeclineOpen(true)}
                    disabled={submitting}
                    className="mt-5 w-full text-sm font-semibold text-rose-700 underline underline-offset-4"
                  >
                    Decline this offer
                  </button>
                </section>
              ) : (
                <section className="section-panel p-5">
                  <h2 className="font-semibold text-navy-900">Decision recorded</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    This offer is {displayStatus.toLowerCase().replaceAll('_', ' ')} and can no longer be changed here.
                  </p>
                  {offer.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => router.push('/candidate/preboarding')}
                      className="btn-primary mt-5 w-full"
                    >
                      Continue to starting steps
                    </button>
                  )}
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(reason) => respond('DECLINE', reason)}
        title="Decline this offer?"
        description="This closes the offer. Share a brief reason so the recruitment team has an accurate record."
        confirmLabel="Decline offer"
        reasonLabel="Reason"
        reasonRequired
        tone="danger"
        busy={submitting}
      />
    </div>
  )
}
