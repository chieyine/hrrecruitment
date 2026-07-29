'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  MessageSquareText,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import { ReasonDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toaster'
import { candidateStatusGuidance, candidateStatusLabel } from '@/lib/candidate-status'
import { formatDate, formatDateTime, getStatusBadgeClass } from '@/lib/utils'

export default function CandidateApplicationDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/candidate/applications/${params.id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load this application.')
        setApplication(data.application)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setApplication(null)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [params.id])

  const nextAction = useMemo(() => {
    if (!application) return null
    const assessment = application.candidateAssessments?.find((item: any) =>
      ['INVITED', 'NOT_STARTED', 'IN_PROGRESS'].includes(item.status)
    )
    if (assessment)
      return {
        label: assessment.status === 'IN_PROGRESS' ? 'Continue assessment' : 'Start assessment',
        href: `/candidate/assessments/${assessment.id}`,
      }
    const interview = application.interviews?.find(
      (item: any) => !['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(item.status) && !item.candidateResponse
    )
    if (interview) return { label: 'Reply to interview', href: '/candidate/interviews' }
    const offer = application.offers?.find((item: any) => ['SENT', 'VIEWED'].includes(item.status))
    if (offer) return { label: 'Review offer', href: `/candidate/offers/${offer.id}` }
    if (application.preboardings?.length) return { label: 'Continue starting steps', href: '/candidate/preboarding' }
    if (application.isDraft)
      return {
        label: 'Continue application',
        href: `/candidate/applications/apply?vacancyId=${application.vacancy.id}`,
      }
    return null
  }, [application])

  const withdraw = async (reason: string) => {
    setWithdrawing(true)
    try {
      const response = await fetch(`/api/candidate/applications/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'WITHDRAW', reason }),
      })
      const data = await response.json()
      if (response.ok) {
        setApplication({ ...application, canWithdraw: false, candidateVisibleStatus: 'WITHDRAWN' })
        setConfirmingWithdraw(false)
        toast('success', 'Application withdrawn.')
      } else {
        toast('error', data.error || 'The application could not be withdrawn.')
      }
    } catch {
      toast('error', 'The application could not be withdrawn. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const candidateStatus = application
    ? application.isDraft
      ? 'APPLICATION_DRAFT'
      : application.candidateVisibleStatus
    : ''
  const guidance = candidateStatus ? candidateStatusGuidance(candidateStatus) : null

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow={application?.vacancy?.referenceNumber || 'Candidate account'}
            title={application?.vacancy?.title || 'Application details'}
            description={
              application
                ? `${application.vacancy.department.name} · ${application.vacancy.dutyStation.name}`
                : 'Status, next steps and recruitment activity for this application.'
            }
            actions={
              <Link href="/candidate/applications" className="btn-secondary">
                <ArrowLeft className="h-4 w-4" /> Applications
              </Link>
            }
          />

          {loading ? (
            <div className="section-panel px-6 py-14 text-center text-sm text-stone-500">Loading application…</div>
          ) : !application ? (
            <div className="section-panel px-6 py-14 text-center">
              <h2 className="font-semibold text-navy-900">Application not found</h2>
              <p className="mt-1 text-sm text-stone-600">It may have been removed or you may no longer have access.</p>
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-50">
                <div className="grid lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="px-5 py-5 sm:px-6">
                    <span className={`status-chip ${getStatusBadgeClass(candidateStatus)}`}>
                      {candidateStatusLabel(candidateStatus)}
                    </span>
                    <h2 className="mt-3 text-lg font-semibold text-brand-950">{guidance?.meaning}</h2>
                    <p className="mt-1 text-sm leading-6 text-brand-900">{guidance?.action}</p>
                  </div>
                  {nextAction && (
                    <div className="border-t border-brand-200 px-5 py-5 lg:border-l lg:border-t-0 sm:px-6">
                      <Link href={nextAction.href} className="btn-primary">
                        {nextAction.label} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              <section aria-labelledby="journey-heading" className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 id="journey-heading" className="text-lg font-semibold text-navy-900">
                      Application activity
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">Activity linked to this application.</p>
                  </div>
                </div>
                <div className="divide-y divide-stone-100">
                  <JourneyRow
                    icon={CheckCircle2}
                    title={application.isDraft ? 'Application saved' : 'Application received'}
                    detail={
                      application.isDraft
                        ? `Last saved ${formatDate(application.updatedAt)}`
                        : `Received ${formatDate(application.submittedAt)}`
                    }
                    status={application.isDraft ? 'Draft' : 'Complete'}
                  />
                  {application.candidateAssessments.map((item: any) => (
                    <JourneyRow
                      key={item.id}
                      icon={ClipboardCheck}
                      title={item.assessment.title}
                      detail={
                        item.assessment.closesAt ? `Closes ${formatDate(item.assessment.closesAt)}` : 'Assessment'
                      }
                      status={item.status}
                      href={`/candidate/assessments/${item.id}`}
                    />
                  ))}
                  {application.interviews.map((item: any) => (
                    <JourneyRow
                      key={item.id}
                      icon={CalendarDays}
                      title={item.title}
                      detail={`${formatDateTime(item.scheduledStart)} · ${item.format.replaceAll('_', ' ').toLowerCase()}`}
                      status={item.status}
                      href={`/candidate/interviews#interview-${item.id}`}
                    />
                  ))}
                  {application.offers.map((item: any) => (
                    <JourneyRow
                      key={item.id}
                      icon={FileCheck2}
                      title={item.position}
                      detail={`Response due ${formatDate(item.acceptanceDeadline)}`}
                      status={item.status}
                      href={`/candidate/offers/${item.id}`}
                    />
                  ))}
                  {application.preboardings.map((item: any) => (
                    <JourneyRow
                      key={item.id}
                      icon={Clock3}
                      title="Before you start"
                      detail={`${item.overallCompletionPercentage}% complete${
                        item.confirmedStartDate ? ` · Start date ${formatDate(item.confirmedStartDate)}` : ''
                      }`}
                      status={item.readinessStatus}
                      href="/candidate/preboarding"
                    />
                  ))}
                  {!application.candidateAssessments.length &&
                    !application.interviews.length &&
                    !application.offers.length &&
                    !application.preboardings.length && (
                      <div className="px-5 py-5 text-sm text-stone-600 sm:px-6">
                        The recruitment team has not added another step yet.
                      </div>
                    )}
                </div>
              </section>

              {!application.isDraft && application.answers.length > 0 && (
                <section aria-labelledby="submission-heading" className="section-panel">
                  <div className="section-heading">
                    <div>
                      <h2 id="submission-heading" className="text-lg font-semibold text-navy-900">
                        Your submission
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">The answers recorded when you applied.</p>
                    </div>
                  </div>
                  <dl className="divide-y divide-stone-100">
                    {application.answers.map((answer: any) => (
                      <div key={answer.id} className="px-5 py-4 sm:px-6">
                        <dt className="text-xs font-semibold text-stone-600">{answer.vacancyQuestion.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-navy-900">
                          {formatRecordedAnswer(answer)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {application.files.length > 0 && (
                    <div className="border-t border-stone-200 px-5 py-4 sm:px-6">
                      <p className="text-xs font-semibold text-stone-600">Attachments</p>
                      <ul className="mt-2 space-y-1 text-sm text-navy-900">
                        {application.files.map((file: any) => (
                          <li key={file.id}>{file.fileAsset.originalName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {!application.isDraft && (
                <section className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div>
                    <h2 className="font-semibold text-navy-900">Need help with this application?</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      Send the recruitment team a message from your account.
                    </p>
                  </div>
                  <Link href="/candidate/messages" className="btn-secondary">
                    <MessageSquareText className="h-4 w-4" /> Messages
                  </Link>
                </section>
              )}

              {application.canWithdraw && (
                <div className="border-t border-stone-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setConfirmingWithdraw(true)}
                    className="text-sm font-semibold text-rose-700 hover:underline"
                  >
                    Withdraw this application
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      <ReasonDialog
        open={confirmingWithdraw}
        onClose={() => setConfirmingWithdraw(false)}
        onConfirm={(reason) => withdraw(reason)}
        title="Withdraw application"
        description="Withdrawing removes you from further consideration for this vacancy. This cannot be undone."
        confirmLabel="Withdraw"
        reasonLabel="Reason for withdrawing"
        reasonRequired
        tone="danger"
        busy={withdrawing}
      />
    </div>
  )
}

function formatRecordedAnswer(answer: { answerJson: string; vacancyQuestion: { fieldType: string } }): string {
  if (answer.vacancyQuestion.fieldType === 'FILE') return 'File attached'
  try {
    const value = JSON.parse(answer.answerJson)
    if (Array.isArray(value)) return value.join(', ') || 'Not answered'
    if (typeof value === 'boolean') return value ? 'Confirmed' : 'Not confirmed'
    if (value === null || value === undefined || String(value).trim() === '') return 'Not answered'
    return String(value)
  } catch {
    return 'Recorded'
  }
}

function JourneyRow({
  icon: Icon,
  title,
  detail,
  status,
  href,
}: {
  icon: typeof Clock3
  title: string
  detail: string
  status: string
  href?: string
}) {
  const content = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 text-brand-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
      </div>
      <span className={`status-chip ${getStatusBadgeClass(status)}`}>{status.replaceAll('_', ' ').toLowerCase()}</span>
      {href && <ArrowRight className="h-4 w-4 text-stone-400" />}
    </>
  )
  return href ? (
    <Link
      href={href}
      className="grid gap-3 px-5 py-4 hover:bg-stone-50 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:px-6"
    >
      {content}
    </Link>
  ) : (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6">{content}</div>
  )
}
