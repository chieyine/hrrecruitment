'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, FileCheck, Loader2 } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ReasonDialog } from '@/components/ui/Dialog'
import { PageIntro } from '@/components/ui/PageElements'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toaster'
import { getStatusBadgeClass } from '@/lib/utils'

const CHECK_LABELS: Record<string, string> = {
  OFFER_ACCEPTED: 'Accepted offer',
  ID_APPROVED: 'Identity evidence',
  QUALIFICATION_APPROVED: 'Qualification evidence',
  FORMS_APPROVED: 'Required forms',
  POLICIES_SIGNED: 'Policy acknowledgements',
  COURSES_COMPLETED: 'Required learning',
  TASKS_COMPLETED: 'Candidate tasks',
  START_DATE_CONFIRMED: 'Confirmed start date',
  REQUIRED_MEETINGS: 'Required meetings',
  REPORTING_ACKNOWLEDGED: 'First-day information',
  REFERENCES_SATISFACTORY: 'References',
  PROFESSIONAL_LICENCE: 'Professional licence',
  MEDICAL_CLEARANCE: 'Medical clearance',
  HR_REVIEW: 'Final HR review',
}

const REVIEWABLE: Record<string, string[]> = {
  form: ['SUBMITTED', 'UNDER_REVIEW'],
  document: ['SUBMITTED', 'UNDER_REVIEW'],
  policy: ['SIGNED'],
  task: ['SUBMITTED'],
  course: ['FAILED', 'CERTIFICATE_SUBMITTED'],
}

function displayStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

function safeJson(value: string | null | undefined) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export default function PreboardingRecordPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const { toast } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [clearanceNote, setClearanceNote] = useState('')
  const [pending, setPending] = useState<
    { kind: 'review'; action: string; resourceId: string; status: string } | { kind: 'waive'; checkId: string } | null
  >(null)
  const [packageId, setPackageId] = useState('')
  const [requirementId, setRequirementId] = useState('')
  const [information, setInformation] = useState({
    category: 'REPORTING',
    title: '',
    content: '',
    acknowledgementRequired: true,
  })
  const [meeting, setMeeting] = useState({
    title: '',
    description: '',
    scheduledStart: '',
    scheduledEnd: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos',
    venue: '',
    meetingLink: '',
    required: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/recruitment/preboarding/${params.id}`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The preboarding record could not be loaded.')
      setData(body)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The preboarding record could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const preboarding = data?.preboarding
  const capabilities = data?.capabilities || { canWaive: false, canClearance: false }
  const closed = preboarding && ['READY_TO_RESUME', 'COMPLETED'].includes(preboarding.status)

  const reviewItems = useMemo(() => {
    if (!preboarding) return []
    return [
      ...preboarding.forms.map((item: any) => ({
        kind: 'form',
        item,
        name: item.formTemplate.title,
        action: 'REVIEW_FORM',
      })),
      ...preboarding.documents.map((item: any) => ({
        kind: 'document',
        item,
        name: item.documentRequirement.name,
        action: 'REVIEW_DOCUMENT',
      })),
      ...preboarding.policyAcknowledgements.map((item: any) => ({
        kind: 'policy',
        item,
        name: item.policyDocument.title,
        action: 'REVIEW_POLICY',
      })),
      ...preboarding.tasks.map((item: any) => ({
        kind: 'task',
        item,
        name: item.taskTemplate.title,
        action: 'REVIEW_TASK',
      })),
      ...preboarding.courses.map((item: any) => ({
        kind: 'course',
        item,
        name: item.course.title,
        action: 'REVIEW_COURSE',
      })),
    ].filter(({ kind, item }) => REVIEWABLE[kind]?.includes(item.status))
  }, [preboarding])

  const outstandingChecks = (preboarding?.readinessChecks || []).filter(
    (check: any) => check.required && check.checkType !== 'HR_REVIEW' && !['PASSED', 'WAIVED'].includes(check.status)
  )

  async function manage(
    action: string,
    resourceId?: string,
    status?: string,
    comment = '',
    rawData?: Record<string, unknown>
  ) {
    if (!preboarding || busy) return
    setBusy(true)
    try {
      const response = await fetch(`/api/recruitment/preboarding/${params.id}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': String(preboarding.lockVersion),
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          action,
          resourceId,
          status,
          comment,
          data: rawData,
          lockVersion: preboarding.lockVersion,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The item could not be updated.')
      toast('success', 'Preboarding record updated.')
      setPending(null)
      await load()
    } catch (manageError) {
      toast('error', manageError instanceof Error ? manageError.message : 'The item could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  function review(action: string, resourceId: string, status: string) {
    if (['RETURNED', 'RESUBMISSION_REQUIRED', 'REJECTED', 'RESET_ATTEMPTS', 'MISSED', 'CANCELLED'].includes(status)) {
      setPending({ kind: 'review', action, resourceId, status })
    } else {
      void manage(action, resourceId, status)
    }
  }

  async function waiveCheck(checkId: string, reason: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/recruitment/preboarding/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkId, reason }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The waiver could not be recorded.')
      toast('success', 'Readiness waiver recorded.')
      setPending(null)
      await load()
    } catch (waiverError) {
      toast('error', waiverError instanceof Error ? waiverError.message : 'The waiver could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmClearance(event: React.FormEvent) {
    event.preventDefault()
    if (!preboarding) return
    setBusy(true)
    try {
      const response = await fetch('/api/recruitment/preboarding/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          preboardingId: preboarding.id,
          comment: clearanceNote,
          lockVersion: preboarding.lockVersion,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Clearance could not be confirmed.')
      toast('success', 'Candidate cleared to start.')
      setClearanceNote('')
      await load()
    } catch (clearanceError) {
      toast('error', clearanceError instanceof Error ? clearanceError.message : 'Clearance could not be confirmed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-6xl space-y-6">
          <Link
            href="/recruitment/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Preboarding
          </Link>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          {loading ? (
            <PageSkeleton />
          ) : preboarding ? (
            <>
              <PageIntro
                title={`${preboarding.application.candidate.legalFirstName} ${preboarding.application.candidate.lastName}`}
                description={`${preboarding.application.vacancy.referenceNumber} · ${preboarding.application.vacancy.title}`}
                actions={
                  <span className={`status-chip ${getStatusBadgeClass(preboarding.readinessStatus)}`}>
                    {displayStatus(preboarding.readinessStatus)}
                  </span>
                }
              />

              <section className="grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 sm:grid-cols-4">
                <div className="bg-white p-4">
                  <p className="text-xs text-stone-500">Completion</p>
                  <p className="mt-1 text-2xl font-semibold text-navy-950">
                    {preboarding.overallCompletionPercentage}%
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-xs text-stone-500">Submitted for review</p>
                  <p className="mt-1 text-2xl font-semibold text-navy-950">{reviewItems.length}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-xs text-stone-500">Checks outstanding</p>
                  <p className="mt-1 text-2xl font-semibold text-navy-950">{outstandingChecks.length}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-xs text-stone-500">Planned start</p>
                  <p className="mt-1 text-sm font-semibold text-navy-950">
                    {preboarding.confirmedStartDate
                      ? new Date(preboarding.confirmedStartDate).toLocaleDateString('en-GB')
                      : 'Not confirmed'}
                  </p>
                </div>
              </section>

              <section className="section-panel overflow-hidden" aria-labelledby="review-queue-heading">
                <div className="section-heading">
                  <div>
                    <h2 id="review-queue-heading" className="text-lg font-semibold text-navy-950">
                      Submitted items
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">Open the evidence before recording a review outcome.</p>
                  </div>
                </div>
                {reviewItems.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-stone-500 sm:px-6">No candidate submissions need review.</div>
                ) : (
                  <div className="divide-y divide-stone-200">
                    {reviewItems.map(({ kind, item, name, action }: any) => (
                      <article key={`${kind}-${item.id}`} className="px-5 py-5 sm:px-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-stone-500">{kind}</p>
                            <h3 className="mt-1 text-sm font-semibold text-navy-950">{name}</h3>
                            <p className="mt-1 text-xs text-stone-500">{displayStatus(item.status)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {kind === 'document' && item.fileAssetId && (
                              <a
                                href={`/api/assets/download/${item.fileAssetId}?disposition=inline`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary"
                              >
                                Open document <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            )}
                            {kind === 'policy' && (item.signedFileId || item.policyDocument.fileAssetId) && (
                              <a
                                href={`/api/assets/download/${item.signedFileId || item.policyDocument.fileAssetId}?disposition=inline`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary"
                              >
                                Open signed policy <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            )}
                            {kind === 'task' && item.evidenceFileId && (
                              <a
                                href={`/api/assets/download/${item.evidenceFileId}?disposition=inline`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary"
                              >
                                Open evidence <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            )}
                            {kind === 'course' && item.certificateFileId && (
                              <a
                                href={`/api/assets/download/${item.certificateFileId}?disposition=inline`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary"
                              >
                                Open certificate <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            )}
                          </div>
                        </div>
                        {kind === 'form' && (
                          <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50">
                            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-stone-700 [&::-webkit-details-marker]:hidden">
                              Review submitted answers
                            </summary>
                            <pre className="max-h-72 overflow-auto border-t border-stone-200 p-3 text-xs leading-5 text-stone-700">
                              {item.responseJson
                                ? JSON.stringify(safeJson(item.responseJson), null, 2)
                                : 'Restricted answers are not available to this account.'}
                            </pre>
                          </details>
                        )}
                        {kind === 'task' && item.candidateComment && (
                          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                            {item.candidateComment}
                          </p>
                        )}
                        {kind === 'course' && (
                          <p className="mt-3 text-sm text-stone-600">
                            Latest score: {item.score == null ? 'not recorded' : `${item.score}%`} · Attempts:{' '}
                            {item.attempts}/{item.course.allowedAttempts}
                          </p>
                        )}
                        {!closed && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {kind === 'form' && (
                              <>
                                <button onClick={() => review(action, item.id, 'APPROVED')} className="btn-primary">
                                  Approve form
                                </button>
                                <button onClick={() => review(action, item.id, 'RETURNED')} className="btn-secondary">
                                  Return for correction
                                </button>
                              </>
                            )}
                            {kind === 'document' && (
                              <>
                                <button
                                  disabled={!item.fileAssetId}
                                  onClick={() => review(action, item.id, 'APPROVED')}
                                  className="btn-primary disabled:opacity-50"
                                >
                                  Approve document
                                </button>
                                <button
                                  onClick={() => review(action, item.id, 'RESUBMISSION_REQUIRED')}
                                  className="btn-secondary"
                                >
                                  Request replacement
                                </button>
                              </>
                            )}
                            {kind === 'policy' && (
                              <>
                                <button onClick={() => review(action, item.id, 'APPROVED')} className="btn-primary">
                                  Accept signature
                                </button>
                                <button onClick={() => review(action, item.id, 'REJECTED')} className="btn-secondary">
                                  Reject signature
                                </button>
                              </>
                            )}
                            {kind === 'task' && (
                              <>
                                <button onClick={() => review(action, item.id, 'APPROVED')} className="btn-primary">
                                  Approve task
                                </button>
                                <button onClick={() => review(action, item.id, 'RETURNED')} className="btn-secondary">
                                  Return task
                                </button>
                              </>
                            )}
                            {kind === 'course' && (
                              item.status === 'CERTIFICATE_SUBMITTED' ? (
                                <>
                                  <button onClick={() => review(action, item.id, 'APPROVED')} className="btn-primary">
                                    Approve certificate
                                  </button>
                                  <button onClick={() => review(action, item.id, 'REJECTED')} className="btn-secondary">
                                    Request another certificate
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => review(action, item.id, 'RESET_ATTEMPTS')}
                                  className="btn-secondary"
                                >
                                  Reset attempts
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="section-panel overflow-hidden" aria-labelledby="readiness-heading">
                <div className="section-heading">
                  <div>
                    <h2 id="readiness-heading" className="text-lg font-semibold text-navy-950">
                      Readiness checks
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      These checks update from approved evidence. They cannot be passed manually.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-stone-200">
                  {preboarding.readinessChecks.map((check: any) => (
                    <div
                      key={check.id}
                      className="flex flex-col justify-between gap-3 px-5 py-3 sm:flex-row sm:items-center sm:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            ['PASSED', 'WAIVED'].includes(check.status) ? 'text-emerald-600' : 'text-stone-300'
                          }`}
                          aria-hidden
                        />
                        <div>
                          <p className="text-sm font-semibold text-navy-950">
                            {CHECK_LABELS[check.checkType] || displayStatus(check.checkType)}
                          </p>
                          {check.waiverReason && <p className="mt-1 text-xs text-amber-700">{check.waiverReason}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`status-chip ${getStatusBadgeClass(check.status)}`}>
                          {displayStatus(check.status)}
                        </span>
                        {!closed &&
                          capabilities.canWaive &&
                          check.checkType !== 'HR_REVIEW' &&
                          !['PASSED', 'WAIVED'].includes(check.status) && (
                            <button
                              type="button"
                              onClick={() => setPending({ kind: 'waive', checkId: check.id })}
                              className="text-xs font-semibold text-amber-800 hover:underline"
                            >
                              Record waiver
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {!closed && capabilities.canClearance && (
                <section className="section-panel p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-navy-950">Final HR clearance</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {outstandingChecks.length
                      ? `${outstandingChecks.length} required check${outstandingChecks.length === 1 ? '' : 's'} must be completed first.`
                      : 'All evidence-derived checks are complete. Record the final review decision.'}
                  </p>
                  <form onSubmit={confirmClearance} className="mt-4 max-w-2xl space-y-3">
                    <label>
                      <span className="field-label">Clearance note</span>
                      <textarea
                        required
                        minLength={10}
                        rows={3}
                        value={clearanceNote}
                        onChange={(event) => setClearanceNote(event.target.value)}
                        placeholder="Record what was checked and any material conditions."
                        className="field-control"
                      />
                    </label>
                    <button
                      disabled={busy || outstandingChecks.length > 0 || clearanceNote.trim().length < 10}
                      className="btn-primary disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <FileCheck className="h-4 w-4" aria-hidden />
                      )}
                      Confirm ready to start
                    </button>
                  </form>
                </section>
              )}

              <details className="section-panel">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-950 sm:px-6 [&::-webkit-details-marker]:hidden">
                  All assigned requirements
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    Forms, documents, policies, learning and tasks
                  </span>
                </summary>
                <div className="border-t border-stone-200">
                  {[
                    ['Forms', preboarding.forms, 'formTemplate'],
                    ['Documents', preboarding.documents, 'documentRequirement'],
                    ['Policies', preboarding.policyAcknowledgements, 'policyDocument'],
                    ['Courses', preboarding.courses, 'course'],
                    ['Tasks', preboarding.tasks, 'taskTemplate'],
                  ].map(([label, items, relation]: any) => (
                    <div key={label} className="border-b border-stone-200 px-5 py-4 last:border-b-0 sm:px-6">
                      <h3 className="text-xs font-bold uppercase tracking-[.12em] text-stone-500">{label}</h3>
                      <div className="mt-2 divide-y divide-stone-100">
                        {items.length === 0 && <p className="py-2 text-sm text-stone-500">None assigned</p>}
                        {items.map((item: any) => (
                          <div key={item.id} className="flex justify-between gap-4 py-2 text-sm">
                            <span className="font-medium text-navy-950">
                              {item[relation]?.title || item[relation]?.name}
                            </span>
                            <span className="text-stone-500">{displayStatus(item.status)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>

              {!closed && (
                <details className="section-panel">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-950 sm:px-6 [&::-webkit-details-marker]:hidden">
                    Add or change requirements
                  </summary>
                  <div className="grid gap-4 border-t border-stone-200 px-5 py-5 md:grid-cols-2 sm:px-6">
                    <div>
                      <label className="field-label">Approved package</label>
                      <div className="flex gap-2">
                        <select
                          value={packageId}
                          onChange={(event) => setPackageId(event.target.value)}
                          className="field-control"
                        >
                          <option value="">Select package</option>
                          {(data.packages || []).map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!packageId || busy}
                          onClick={() => manage('ASSIGN_PACKAGE', packageId)}
                          className="btn-secondary"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Additional document</label>
                      <div className="flex gap-2">
                        <select
                          value={requirementId}
                          onChange={(event) => setRequirementId(event.target.value)}
                          className="field-control"
                        >
                          <option value="">Select requirement</option>
                          {(data.requirements || []).map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!requirementId || busy}
                          onClick={() => manage('ADD_DOCUMENT', requirementId)}
                          className="btn-secondary"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              )}

              <section className="section-panel overflow-hidden">
                <div className="section-heading">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-950">First-day arrangements</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      Information and meetings already shared with the candidate.
                    </p>
                  </div>
                </div>
                <div className="grid gap-px bg-stone-200 md:grid-cols-2">
                  <div className="bg-white p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-navy-950">Information</h3>
                    <div className="mt-3 space-y-3">
                      {preboarding.infoItems.length === 0 && (
                        <p className="text-sm text-stone-500">Nothing shared yet.</p>
                      )}
                      {preboarding.infoItems.map((item: any) => (
                        <div key={item.id} className="rounded-lg bg-stone-50 p-3">
                          <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-600">{item.content}</p>
                          <p className="mt-2 text-[11px] text-stone-500">
                            {item.acknowledgementRequired
                              ? item.acknowledgedAt
                                ? 'Candidate acknowledged'
                                : 'Awaiting acknowledgement'
                              : 'No acknowledgement required'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-navy-950">Meetings</h3>
                    <div className="mt-3 space-y-3">
                      {preboarding.meetings.length === 0 && (
                        <p className="text-sm text-stone-500">No meetings scheduled.</p>
                      )}
                      {preboarding.meetings.map((item: any) => (
                        <div key={item.id} className="rounded-lg bg-stone-50 p-3">
                          <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                          <p className="mt-1 text-xs text-stone-600">
                            {new Date(item.scheduledStart).toLocaleString()} · {displayStatus(item.status)}
                          </p>
                          {!closed && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {['CONFIRMED', 'ATTENDED', 'MISSED', 'CANCELLED'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => review('UPDATE_MEETING', item.id, status)}
                                  className="text-xs font-semibold text-brand-800 hover:underline"
                                >
                                  {displayStatus(status)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {!closed && (
                <details className="section-panel">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-950 sm:px-6 [&::-webkit-details-marker]:hidden">
                    Add first-day information or a meeting
                  </summary>
                  <div className="grid gap-px border-t border-stone-200 bg-stone-200 lg:grid-cols-2">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        void manage('ADD_INFORMATION', undefined, undefined, '', information)
                      }}
                      className="space-y-3 bg-white p-5 sm:p-6"
                    >
                      <h3 className="text-sm font-semibold text-navy-950">Share information</h3>
                      <select
                        value={information.category}
                        onChange={(event) => setInformation({ ...information, category: event.target.value })}
                        className="field-control"
                      >
                        <option value="REPORTING">First-day reporting</option>
                        <option value="TRAVEL">Travel</option>
                        <option value="GENERAL">General</option>
                      </select>
                      <input
                        required
                        value={information.title}
                        onChange={(event) => setInformation({ ...information, title: event.target.value })}
                        placeholder="Title"
                        className="field-control"
                      />
                      <textarea
                        required
                        minLength={5}
                        rows={4}
                        value={information.content}
                        onChange={(event) => setInformation({ ...information, content: event.target.value })}
                        placeholder="Address, arrival time, contact person and what to bring"
                        className="field-control"
                      />
                      <label className="flex items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={information.acknowledgementRequired}
                          onChange={(event) =>
                            setInformation({ ...information, acknowledgementRequired: event.target.checked })
                          }
                        />
                        Candidate must acknowledge
                      </label>
                      <button disabled={busy} className="btn-primary">
                        Share information
                      </button>
                    </form>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        void manage('ADD_MEETING', undefined, undefined, '', {
                          ...meeting,
                          scheduledStart: new Date(meeting.scheduledStart).toISOString(),
                          scheduledEnd: new Date(meeting.scheduledEnd).toISOString(),
                        })
                      }}
                      className="space-y-3 bg-white p-5 sm:p-6"
                    >
                      <h3 className="text-sm font-semibold text-navy-950">Schedule meeting</h3>
                      <input
                        required
                        value={meeting.title}
                        onChange={(event) => setMeeting({ ...meeting, title: event.target.value })}
                        placeholder="Meeting title"
                        className="field-control"
                      />
                      <textarea
                        rows={2}
                        value={meeting.description}
                        onChange={(event) => setMeeting({ ...meeting, description: event.target.value })}
                        placeholder="Purpose and preparation"
                        className="field-control"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          aria-label="Meeting starts"
                          required
                          type="datetime-local"
                          value={meeting.scheduledStart}
                          onChange={(event) => setMeeting({ ...meeting, scheduledStart: event.target.value })}
                          className="field-control"
                        />
                        <input
                          aria-label="Meeting ends"
                          required
                          type="datetime-local"
                          value={meeting.scheduledEnd}
                          onChange={(event) => setMeeting({ ...meeting, scheduledEnd: event.target.value })}
                          className="field-control"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={meeting.venue}
                          onChange={(event) => setMeeting({ ...meeting, venue: event.target.value })}
                          placeholder="Venue"
                          className="field-control"
                        />
                        <input
                          type="url"
                          value={meeting.meetingLink}
                          onChange={(event) => setMeeting({ ...meeting, meetingLink: event.target.value })}
                          placeholder="Meeting link"
                          className="field-control"
                        />
                      </div>
                      <button
                        disabled={busy || !meeting.scheduledStart || !meeting.scheduledEnd}
                        className="btn-primary"
                      >
                        Schedule meeting
                      </button>
                    </form>
                  </div>
                </details>
              )}
            </>
          ) : null}
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return
          if (pending.kind === 'waive') await waiveCheck(pending.checkId, reason)
          else await manage(pending.action, pending.resourceId, pending.status, reason)
        }}
        title={pending?.kind === 'waive' ? 'Record readiness waiver' : 'Record review outcome'}
        description={
          pending?.kind === 'waive'
            ? 'State who approved the exception and why the requirement does not apply.'
            : 'Give the candidate a clear reason and say what must change.'
        }
        confirmLabel={pending?.kind === 'waive' ? 'Record waiver' : 'Submit outcome'}
        reasonRequired
        tone={pending?.kind === 'waive' ? 'danger' : 'default'}
        busy={busy}
      />
    </div>
  )
}
