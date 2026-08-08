'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  History,
  Mail,
  ShieldAlert,
  Star,
  UserRound,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ReasonDialog } from '@/components/ui/Dialog'
import CaseGovernanceActions from '@/components/admin/CaseGovernanceActions'
import { formatDate, formatDateTime, getStatusBadgeClass } from '@/lib/utils'

type Capability = {
  changeStage?: boolean
  decideEligibility?: boolean
  submitScorecard?: boolean
  manageCase?: boolean
  reopenScorecard?: boolean
  messageCandidate?: boolean
  exportDocumentation?: boolean
  viewAudit?: boolean
  handover?: boolean
}

function statusLabel(value?: string | null) {
  return value ? value.replaceAll('_', ' ').toLowerCase() : 'not started'
}

function answerText(answerJson: string) {
  try {
    const value = JSON.parse(answerJson)
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) return value.join(', ')
    if (value === null || value === '') return 'Not answered'
    return String(value)
  } catch {
    return answerJson
  }
}

function year(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 4) : String(parsed.getUTCFullYear())
}

export default function ApplicationRecordPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [eligibility, setEligibility] = useState<any>(null)
  const [eligibilityDecision, setEligibilityDecision] = useState<string | null>(null)
  const [criteria, setCriteria] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [scoreComments, setScoreComments] = useState<Record<string, string>>({})
  const [conflictType, setConflictType] = useState('')
  const [conflictDetails, setConflictDetails] = useState('')
  const [newStage, setNewStage] = useState('')
  const [stageReason, setStageReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const [documentReview, setDocumentReview] = useState<Record<string, { status: 'APPROVED' | 'REJECTED'; notes: string; source: string; rejectionReason: string; restricted: boolean }>>({})

  const verifyDocument = async (documentId: string) => {
    const review = documentReview[documentId]
    if (!review) return
    setBusy(`document-${documentId}`)
    const response = await fetch(`/api/recruitment/candidate-documents/${documentId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: review.status, verificationNotes: review.notes, verificationSource: review.source, rejectionReason: review.rejectionReason || undefined, restricted: review.restricted }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Document verification saved.' : data.error || 'Document verification could not be saved.')
    setMessageIsError(!response.ok)
    setBusy(null)
    if (response.ok) setApplication((current: any) => ({ ...current, candidate: { ...current.candidate, documents: current.candidate.documents.map((document: any) => document.id === documentId ? data.document : document) } }))
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/recruitment/applications/${id}`)
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'The application could not be loaded.')
        if (!active) return
        const loaded = body.application
        setApplication(loaded)

        if (loaded.capabilities?.submitScorecard) {
          const scorecardResponse = await fetch(`/api/recruitment/scorecards?applicationId=${id}`)
          if (scorecardResponse.ok) {
            const scorecardBody = await scorecardResponse.json()
            const loadedCriteria = scorecardBody.template?.criteria || []
            if (active) {
              setCriteria(loadedCriteria)
              setScores(Object.fromEntries(loadedCriteria.map((criterion: any) => [criterion.id, 0])))
            }
          }
        }

        if (loaded.capabilities?.decideEligibility) {
          const eligibilityResponse = await fetch(`/api/recruitment/eligibility?applicationId=${id}`)
          if (eligibilityResponse.ok) {
            const eligibilityBody = await eligibilityResponse.json()
            if (active) setEligibility(eligibilityBody.evaluations?.[0] || null)
          }
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'The application could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  const outstanding = useMemo(() => {
    if (!application) return []
    return [
      ...(application.possibleDuplicates?.length ? ['Check the possible duplicate identity before progressing.'] : []),
      ...(application.interviews || []).flatMap((interview: any) => {
        const missing = Math.max(0, (interview.panelMembers?.length || 0) - (interview.panelSubmissions?.length || 0))
        return missing ? [`${missing} interview score${missing === 1 ? '' : 's'} still outstanding.`] : []
      }),
      ...(application.offers || [])
        .filter(
          (offer: any) =>
            ['SENT', 'VIEWED'].includes(offer.status) &&
            new Date(offer.acceptanceDeadline).getTime() < now + 48 * 60 * 60_000
        )
        .map((offer: any) => `Offer response due ${formatDateTime(offer.acceptanceDeadline)}.`),
      ...(application.preboardings || [])
        .filter(
          (item: any) =>
            item.readinessStatus !== 'READY_TO_RESUME' &&
            item.confirmedStartDate &&
            new Date(item.confirmedStartDate).getTime() < now + 7 * 86_400_000
        )
        .map(() => 'Preboarding is not cleared for the confirmed start date.'),
      ...(application.deliveryHistory || [])
        .filter((item: any) => ['FAILED', 'DEAD_LETTER'].includes(item.status))
        .map((item: any) => `Delivery failed: ${item.subject || 'candidate notification'}.`),
    ]
  }, [application, now])

  const setNotice = (text: string, isError = false) => {
    setMessage(text)
    setMessageIsError(isError)
  }

  const updateStage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newStage || stageReason.trim().length < 10) {
      setNotice('Add a clear reason of at least 10 characters.', true)
      return
    }
    setBusy('stage')
    try {
      const response = await fetch(`/api/recruitment/applications/${id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalStatus: newStage,
          reason: stageReason.trim(),
          lockVersion: application.lockVersion,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The stage could not be updated.')
      setApplication((current: any) => ({
        ...current,
        ...body.application,
        allowedStageTransitions: [],
      }))
      setNewStage('')
      setStageReason('')
      setNotice('Stage updated.')
      window.location.reload()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The stage could not be updated.', true)
    } finally {
      setBusy(null)
    }
  }

  const decideEligibility = async (decision: string, reason: string) => {
    if (!eligibility) return
    setBusy('eligibility')
    try {
      const response = await fetch('/api/recruitment/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DECIDE',
          evaluationId: eligibility.id,
          humanDecision: decision,
          decisionReason: reason,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The eligibility decision could not be recorded.')
      setEligibility(body.result)
      setEligibilityDecision(null)
      setNotice('Eligibility decision recorded.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The eligibility decision could not be recorded.', true)
    } finally {
      setBusy(null)
    }
  }

  const submitScorecard = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!conflictType) {
      setNotice('Complete the conflict declaration before scoring.', true)
      return
    }
    setBusy('scorecard')
    try {
      const conflictResponse = await fetch(`/api/recruitment/applications/${id}/conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictType, details: conflictDetails }),
      })
      const conflictBody = await conflictResponse.json()
      if (!conflictResponse.ok) throw new Error(conflictBody.error || 'The conflict declaration was not saved.')

      const response = await fetch('/api/recruitment/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: id,
          criterionScores: criteria.map((criterion) => ({
            criterionId: criterion.id,
            score: scores[criterion.id] ?? 0,
            comment: scoreComments[criterion.id]?.trim() || undefined,
          })),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The scorecard was not saved.')
      setNotice(`Scorecard submitted: ${body.totalScore}%.`)
      window.location.reload()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The scorecard was not saved.', true)
    } finally {
      setBusy(null)
    }
  }

  if (loading)
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="flex flex-1 items-center justify-center">
          <p className="text-sm text-stone-600">Loading application…</p>
        </main>
        <Footer />
      </div>
    )

  if (loadError || !application)
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-stone-950">Application unavailable</h1>
            <p className="mt-2 text-sm text-stone-600">{loadError || 'This record could not be found.'}</p>
            <Link href="/recruitment/applications" className="btn-secondary mt-5">
              Back to applications
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )

  const capabilities: Capability = application.capabilities || {}
  const profile = application.submittedProfile
  const candidateName =
    [application.candidate?.legalFirstName, application.candidate?.lastName].filter(Boolean).join(' ') ||
    [profile?.legalFirstName, profile?.lastName].filter(Boolean).join(' ') ||
    'Candidate'
  const totalAvailable = criteria.reduce((total, criterion) => total + (criterion.maximumScore || 0), 0)
  const allowedStages: string[] = application.allowedStageTransitions || []
  const receivedReferences =
    application.referees?.filter((referee: any) => referee.requests?.some((request: any) => request.response)).length ||
    0

  const journey = [
    ['Application', application.submittedAt ? `Received ${formatDate(application.submittedAt)}` : 'Not received'],
    [
      'Screening',
      application.scorecards?.length
        ? `${application.scorecards.filter((item: any) => item.status === 'SUBMITTED').length} submitted`
        : 'Not scored',
    ],
    [
      'Assessment',
      application.candidateAssessments?.[0] ? statusLabel(application.candidateAssessments[0].status) : 'Not required',
    ],
    ['Interview', application.interviews?.[0] ? statusLabel(application.interviews[0].status) : 'Not arranged'],
    [
      'References',
      application.referees?.length ? `${receivedReferences}/${application.referees.length} received` : 'Not started',
    ],
    ['Offer / joining', application.offers?.[0] ? statusLabel(application.offers[0].status) : 'Not started'],
  ]

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <Link
            href="/recruitment/applications"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Applications
          </Link>

          {message && (
            <div
              role={messageIsError ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                messageIsError
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {messageIsError ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <Check className="mt-0.5 h-4 w-4" />}
              {message}
            </div>
          )}

          <header className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-chip border ${getStatusBadgeClass(application.internalStatus)}`}>
                      {statusLabel(application.internalStatus)}
                    </span>
                    <span className="font-mono text-xs text-stone-500">
                      {application.referenceNumber || application.id}
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">{candidateName}</h1>
                  <p className="mt-2 text-base text-stone-600">
                    {application.vacancy.title} · {application.vacancy.department?.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">{application.vacancy.referenceNumber}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {capabilities.exportDocumentation && (
                    <a href={`/api/recruitment/applications/${id}/documentation`} className="btn-secondary">
                      <Download className="h-4 w-4" />
                      Export record
                    </a>
                  )}
                  {capabilities.handover && (
                    <Link href={`/recruitment/applications/${id}/handover`} className="btn-primary">
                      Joining handover
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <dl className="grid border-stone-100 sm:grid-cols-2 lg:grid-cols-6">
              {journey.map(([label, value]) => (
                <div key={label} className="border-b border-stone-100 p-4 sm:border-r lg:border-b-0">
                  <dt className="text-xs font-medium text-stone-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold capitalize text-stone-900">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          {application.possibleDuplicates?.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Possible duplicate profile</p>
                <p className="mt-1">
                  The same phone number appears on {application.possibleDuplicates.length} other profile
                  {application.possibleDuplicates.length === 1 ? '' : 's'}. Confirm identity before progressing.
                </p>
              </div>
            </div>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <section className="section-panel" aria-labelledby="submitted-application-heading">
                <div className="section-heading">
                  <div>
                    <h2 id="submitted-application-heading" className="flex items-center gap-2 text-lg font-semibold">
                      <UserRound className="h-5 w-5 text-brand-800" />
                      Submitted application
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      The profile and answers held when this application was submitted.
                    </p>
                  </div>
                  <span className="text-xs text-stone-500">Updated {formatDate(application.updatedAt)}</span>
                </div>

                {application.candidate?.user && (
                  <dl className="mb-6 grid gap-4 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-stone-500">Email</dt>
                      <dd className="mt-1 font-medium text-stone-900">{application.candidate.user.email || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Phone</dt>
                      <dd className="mt-1 font-medium text-stone-900">
                        {application.candidate.primaryPhone || application.candidate.user.phone || '—'}
                      </dd>
                    </div>
                  </dl>
                )}

                {profile ? (
                  <div className="space-y-7">
                    <dl className="grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-stone-500">Nationality</dt>
                        <dd className="mt-1 font-medium text-stone-900">{profile.nationality || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Based in</dt>
                        <dd className="mt-1 font-medium text-stone-900">
                          {[profile.city, profile.state, profile.countryOfResidence].filter(Boolean).join(', ') ||
                            'Not provided'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Relocation</dt>
                        <dd className="mt-1 font-medium text-stone-900">
                          {profile.willingnessToRelocate ? 'Open to relocation' : 'Not indicated'}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <h3 className="text-sm font-semibold text-stone-950">Employment</h3>
                      {profile.employment?.length ? (
                        <div className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
                          {profile.employment.map((item: any, index: number) => (
                            <div key={`${item.employer}-${index}`} className="py-4">
                              <p className="font-medium text-stone-950">
                                {item.jobTitle || 'Role'} · {item.employer || 'Employer'}
                              </p>
                              <p className="mt-1 text-sm text-stone-500">
                                {year(item.startDate)}–{item.isCurrent ? 'present' : year(item.endDate)}
                                {item.location ? ` · ${item.location}` : ''}
                              </p>
                              {item.responsibilities && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                                  {item.responsibilities}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-stone-500">No employment history was included.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-stone-950">Education</h3>
                      {profile.education?.length ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {profile.education.map((item: any, index: number) => (
                            <div
                              key={`${item.institution}-${index}`}
                              className="rounded-xl border border-stone-200 p-4"
                            >
                              <p className="font-medium text-stone-950">
                                {[item.qualification, item.fieldOfStudy].filter(Boolean).join(' · ')}
                              </p>
                              <p className="mt-1 text-sm text-stone-500">
                                {item.institution || 'Institution not provided'}
                                {item.completionYear ? ` · ${item.completionYear}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-stone-500">No education history was included.</p>
                      )}
                    </div>

                    {profile.assistedEntry && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-semibold">Submitted with HR assistance</p>
                        <p className="mt-1">{profile.assistedEntry.reason}</p>
                        {profile.assistedEntry.missingRequiredDocumentEvidence?.length > 0 && (
                          <p className="mt-2">
                            Document follow-up: {profile.assistedEntry.missingRequiredDocumentEvidence.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">No submitted profile snapshot is available for this record.</p>
                )}

                <div className="mt-8 border-t border-stone-200 pt-6">
                  <h3 className="text-sm font-semibold text-stone-950">Vacancy questions</h3>
                  {application.answers?.length ? (
                    <dl className="mt-3 divide-y divide-stone-100">
                      {application.answers.map((answer: any) => (
                        <div key={answer.id} className="py-4">
                          <dt className="text-sm font-medium text-stone-700">{answer.vacancyQuestion.label}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-950">
                            {answerText(answer.answerJson)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">No vacancy questions were used.</p>
                  )}
                </div>

                <div className="mt-6 border-t border-stone-200 pt-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                    <FileText className="h-4 w-4" />
                    Documents
                  </h3>
                  {application.files?.length ? (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {application.files.map((file: any) => (
                        <li key={file.id}>
                          <a
                            href={`/api/assets/download/${file.fileAsset.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 text-sm font-medium text-brand-800 hover:border-brand-300 hover:bg-brand-50"
                          >
                            <span className="truncate">{file.fileAsset.originalName}</span>
                            <Download className="h-4 w-4 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">No application documents are attached.</p>
                  )}
                </div>

                {application.candidate.documents?.length > 0 && (
                  <div className="mt-6 border-t border-stone-200 pt-6">
                    <h3 className="text-sm font-semibold text-stone-950">Candidate document verification</h3>
                    <p className="mt-1 text-xs text-stone-500">Each upload is preserved as a version. Verify only the current version and record how it was checked.</p>
                    <div className="mt-3 space-y-3">
                      {application.candidate.documents.map((document: any) => {
                        const review = documentReview[document.id] || { status: 'APPROVED' as const, notes: '', source: '', rejectionReason: '', restricted: false }
                        return (
                          <div key={document.id} className="rounded-xl border border-stone-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <a href={`/api/assets/download/${document.fileAsset.id}`} className="text-sm font-semibold text-brand-800 hover:underline">{document.documentType} · version {document.versionNumber} · {document.fileAsset.originalName}</a>
                              <span className="status-chip bg-stone-100 text-stone-700">{document.status}</span>
                            </div>
                            {document.status !== 'SUPERSEDED' && (!document.restricted || application.capabilities.readRestricted) && (
                              <div className="mt-3 grid gap-2 md:grid-cols-2">
                                <select className="field-control" value={review.status} onChange={(event) => setDocumentReview({ ...documentReview, [document.id]: { ...review, status: event.target.value as 'APPROVED' | 'REJECTED' } })}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select>
                                <input className="field-control" placeholder="Verification source" value={review.source} onChange={(event) => setDocumentReview({ ...documentReview, [document.id]: { ...review, source: event.target.value } })} />
                                <textarea className="field-control md:col-span-2" placeholder="Verification notes" value={review.notes} onChange={(event) => setDocumentReview({ ...documentReview, [document.id]: { ...review, notes: event.target.value } })} />
                                {review.status === 'REJECTED' && <textarea className="field-control md:col-span-2" placeholder="Reason for rejection" value={review.rejectionReason} onChange={(event) => setDocumentReview({ ...documentReview, [document.id]: { ...review, rejectionReason: event.target.value } })} />}
                                <label className="flex items-center gap-2 text-xs font-semibold text-stone-700"><input type="checkbox" checked={review.restricted} onChange={(event) => setDocumentReview({ ...documentReview, [document.id]: { ...review, restricted: event.target.checked } })} />Restrict verification notes</label>
                                <button type="button" className="btn-secondary justify-self-start" disabled={busy === `document-${document.id}` || review.notes.trim().length < 5 || review.source.trim().length < 2 || (review.status === 'REJECTED' && review.rejectionReason.trim().length < 5)} onClick={() => verifyDocument(document.id)}>Save verification</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>

              {capabilities.submitScorecard && (
                <section className="section-panel" aria-labelledby="screening-heading">
                  <div className="section-heading">
                    <div>
                      <h2 id="screening-heading" className="flex items-center gap-2 text-lg font-semibold">
                        <Star className="h-5 w-5 text-amber-600" />
                        Screening scorecard
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">
                        Score only the evidence in the submitted application.
                      </p>
                    </div>
                  </div>
                  {criteria.length ? (
                    <form onSubmit={submitScorecard} className="space-y-6">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <label className="text-sm font-semibold text-amber-950">
                          Conflict declaration
                          <select
                            required
                            value={conflictType}
                            onChange={(event) => setConflictType(event.target.value)}
                            className="field-control mt-2"
                          >
                            <option value="">Choose one</option>
                            <option value="NONE">No conflict</option>
                            <option value="FAMILY">Family</option>
                            <option value="PERSONAL">Personal</option>
                            <option value="SUPERVISORY">Supervisory</option>
                            <option value="COLLEAGUE">Colleague</option>
                            <option value="FINANCIAL">Financial</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </label>
                        {conflictType && conflictType !== 'NONE' && (
                          <textarea
                            required
                            value={conflictDetails}
                            onChange={(event) => setConflictDetails(event.target.value)}
                            rows={3}
                            placeholder="Describe the conflict. Scoring remains blocked until it is resolved."
                            className="field-control mt-3"
                          />
                        )}
                      </div>
                      {criteria.map((criterion) => (
                        <fieldset key={criterion.id} className="border-t border-stone-200 pt-5">
                          <div className="flex items-start justify-between gap-4">
                            <legend className="text-sm font-semibold text-stone-950">{criterion.name}</legend>
                            <span className="font-mono text-sm font-semibold text-brand-800">
                              {scores[criterion.id] ?? 0}/{criterion.maximumScore}
                            </span>
                          </div>
                          {criterion.guidance && <p className="mt-1 text-sm text-stone-600">{criterion.guidance}</p>}
                          <input
                            type="range"
                            min={0}
                            max={criterion.maximumScore}
                            value={scores[criterion.id] ?? 0}
                            onChange={(event) =>
                              setScores((current) => ({
                                ...current,
                                [criterion.id]: Number(event.target.value),
                              }))
                            }
                            className="mt-3 w-full accent-brand-700"
                          />
                          <textarea
                            required={Boolean(criterion.commentRequired)}
                            value={scoreComments[criterion.id] || ''}
                            onChange={(event) =>
                              setScoreComments((current) => ({
                                ...current,
                                [criterion.id]: event.target.value,
                              }))
                            }
                            rows={2}
                            placeholder={criterion.commentRequired ? 'Evidence comment required' : 'Evidence comment'}
                            className="field-control mt-3"
                          />
                        </fieldset>
                      ))}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5">
                        <p className="text-sm font-semibold text-stone-900">
                          Raw score {Object.values(scores).reduce((total, score) => total + score, 0)}/{totalAvailable}
                        </p>
                        <button disabled={busy !== null} className="btn-primary">
                          {busy === 'scorecard' ? 'Submitting…' : 'Submit scorecard'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-stone-600">No screening scorecard is configured for this vacancy.</p>
                  )}
                </section>
              )}

              <section className="section-panel" aria-labelledby="activity-heading">
                <div className="section-heading">
                  <div>
                    <h2 id="activity-heading" className="flex items-center gap-2 text-lg font-semibold">
                      <History className="h-5 w-5 text-brand-800" />
                      Activity
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">Stage history and the application’s working record.</p>
                  </div>
                </div>
                {application.stageHistory?.length ? (
                  <ol className="divide-y divide-stone-100">
                    {application.stageHistory.map((event: any) => (
                      <li key={event.id} className="py-4">
                        <p className="text-sm font-medium capitalize text-stone-950">
                          {statusLabel(event.fromStatus)} → {statusLabel(event.toStatus)}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatDateTime(event.createdAt)}
                          {event.reason ? ` · ${event.reason}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-stone-500">No stage changes have been recorded.</p>
                )}
                <div className="mt-5 grid gap-3 border-t border-stone-200 pt-5 sm:grid-cols-2">
                  {capabilities.messageCandidate && (
                    <Link
                      href={`/recruitment/communications?applicationId=${id}`}
                      className="flex items-center justify-between rounded-xl border border-stone-200 p-4 text-sm font-semibold text-stone-900 hover:border-brand-300"
                    >
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Candidate messages
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                  {capabilities.viewAudit && (
                    <Link
                      href={`/recruitment/audit?resourceId=${id}`}
                      className="flex items-center justify-between rounded-xl border border-stone-200 p-4 text-sm font-semibold text-stone-900 hover:border-brand-300"
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Audit record
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-stone-950">What needs attention</h2>
                {outstanding.length ? (
                  <ul className="mt-3 space-y-3">
                    {outstanding.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-amber-950">
                        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-stone-600">No overdue or unresolved item is recorded.</p>
                )}
              </section>

              {capabilities.decideEligibility && eligibility && (
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-stone-950">Eligibility</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    System result: <strong className="capitalize">{statusLabel(eligibility.suggestedOutcome)}</strong>
                  </p>
                  {eligibility.humanDecision ? (
                    <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm">
                      <p className="font-semibold capitalize">{statusLabel(eligibility.humanDecision)}</p>
                      <p className="mt-1 text-stone-600">{eligibility.decisionReason}</p>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => setEligibilityDecision('ELIGIBLE')}
                        className="btn-secondary justify-center"
                      >
                        Confirm eligible
                      </button>
                      <button
                        type="button"
                        onClick={() => setEligibilityDecision('INELIGIBLE')}
                        className="btn-secondary justify-center"
                      >
                        Confirm ineligible
                      </button>
                      <button
                        type="button"
                        onClick={() => setEligibilityDecision('NEEDS_MORE_INFORMATION')}
                        className="text-sm font-semibold text-brand-800"
                      >
                        More information needed
                      </button>
                    </div>
                  )}
                </section>
              )}

              {capabilities.changeStage && allowedStages.length > 0 && (
                <section className="rounded-2xl border border-brand-200 bg-brand-950 p-5 text-white shadow-sm">
                  <h2 className="text-base font-semibold">Move this application</h2>
                  <p className="mt-1 text-sm text-brand-100">Only valid next stages are available.</p>
                  <form onSubmit={updateStage} className="mt-4 space-y-3">
                    <label className="block text-sm font-medium">
                      Next stage
                      <select
                        required
                        value={newStage}
                        onChange={(event) => setNewStage(event.target.value)}
                        className="mt-2 block w-full rounded-lg border border-white/20 bg-white px-3 py-2.5 text-sm text-stone-950"
                      >
                        <option value="">Choose a stage</option>
                        {allowedStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {statusLabel(stage)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Reason
                      <textarea
                        required
                        minLength={10}
                        rows={3}
                        value={stageReason}
                        onChange={(event) => setStageReason(event.target.value)}
                        className="mt-2 block w-full rounded-lg border border-white/20 bg-white px-3 py-2.5 text-sm text-stone-950"
                        placeholder="Record the evidence for this change"
                      />
                    </label>
                    <button
                      disabled={busy !== null || !newStage || stageReason.trim().length < 10}
                      className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-950 disabled:opacity-50"
                    >
                      {busy === 'stage' ? 'Updating…' : 'Update stage'}
                    </button>
                  </form>
                </section>
              )}

              {capabilities.manageCase && (
                <details className="rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-stone-950">
                    Case administration
                  </summary>
                  <div className="border-t border-stone-100 p-4">
                    <CaseGovernanceActions
                      applicationId={id}
                      assignedReviewerId={application.assignedReviewerId}
                      scorecards={(application.scorecards || []).map((scorecard: any) => ({
                        id: scorecard.id,
                        status: scorecard.status,
                        scorecardType: scorecard.scorecardType,
                      }))}
                      canReopenScorecard={Boolean(capabilities.reopenScorecard)}
                      onChanged={() => window.location.reload()}
                    />
                  </div>
                </details>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={eligibilityDecision !== null}
        onClose={() => setEligibilityDecision(null)}
        onConfirm={(reason) => {
          if (eligibilityDecision) return decideEligibility(eligibilityDecision, reason)
        }}
        title={`Record ${statusLabel(eligibilityDecision)}`}
        description="State the application evidence behind this decision. The reason is retained in the case record."
        confirmLabel={busy === 'eligibility' ? 'Recording…' : 'Record decision'}
        reasonLabel="Decision reason"
        reasonRequired
        tone={eligibilityDecision === 'INELIGIBLE' ? 'danger' : 'default'}
      />
    </div>
  )
}
