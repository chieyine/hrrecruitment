import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  FileText,
  MessageSquareText,
  UserRound,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import NotificationInbox from '@/components/shared/NotificationInbox'
import { EmptyState } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { profileCompletion } from '@/lib/profile-completion'
import { candidateFacingStatus, candidateStatusLabel } from '@/lib/candidate-status'

const TERMINAL_APPLICATIONS = [
  'DRAFT',
  'NOT_SELECTED',
  'INELIGIBLE',
  'WITHDRAWN',
  'CANCELLED',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
  'TRANSFERRED_TO_ERP',
]

export default async function CandidateDashboardPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
    include: {
      education: true,
      employment: true,
      licences: true,
      certifications: true,
      skills: true,
      languages: true,
      documents: true,
    },
  })

  const applications = profile
    ? await prisma.application.findMany({
        where: { candidateId: profile.id },
        include: {
          vacancy: { include: { department: true, dutyStation: true } },
          preboardings: { include: { readinessConfirmation: true } },
          candidateAssessments: {
            where: { status: { in: ['INVITED', 'NOT_STARTED', 'IN_PROGRESS'] } },
            include: { assessment: { select: { title: true, closesAt: true } } },
          },
          interviews: {
            where: { status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] } },
            select: { id: true, title: true, scheduledStart: true },
          },
          offers: {
            where: { status: { in: ['SENT', 'VIEWED'] } },
            select: { id: true, acceptanceDeadline: true },
          },
          messageThreads: {
            include: {
              messages: {
                where: { readAt: null, senderUserId: { not: user.userId } },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  const completion = profileCompletion(profile)
  const actions = applications.flatMap((application) => [
    ...application.candidateAssessments.map((assessment) => ({
      key: `assessment-${assessment.id}`,
      type: 'Assessment',
      label: assessment.assessment.title,
      detail: assessment.assessment.closesAt
        ? `Complete by ${formatDate(assessment.assessment.closesAt)}`
        : 'Ready when you are',
      href: `/candidate/assessments/${assessment.id}`,
    })),
    ...application.interviews.map((interview) => ({
      key: `interview-${interview.id}`,
      type: 'Interview',
      label: interview.title,
      detail: `Scheduled for ${formatDate(interview.scheduledStart)}`,
      href: '/candidate/interviews',
    })),
    ...application.offers.map((offer) => ({
      key: `offer-${offer.id}`,
      type: 'Offer',
      label: 'Your offer is ready to review',
      detail: `Please respond by ${formatDate(offer.acceptanceDeadline)}`,
      href: `/candidate/offers/${offer.id}`,
    })),
  ])
  const unreadMessages = applications.reduce(
    (sum, application) =>
      sum + application.messageThreads.reduce((threadSum, thread) => threadSum + thread.messages.length, 0),
    0
  )
  const submitted = applications.filter((application) => application.submittedAt).length
  const inProgress = applications.filter(
    (application) => !TERMINAL_APPLICATIONS.includes(application.internalStatus)
  ).length
  const displayName = profile?.preferredName || profile?.legalFirstName || user.email.split('@')[0]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-7">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft">
            <div className="grid lg:grid-cols-[1.35fr_.65fr]">
              <div className="px-6 py-8 sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-700">Candidate overview</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900 sm:text-4xl">
                  Welcome back, {displayName}.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
                  Your applications and anything FRAD needs from you are collected here.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href="/candidate/tasks" className="btn-primary">
                    View my actions{' '}
                    {actions.length > 0 && (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{actions.length}</span>
                    )}
                  </Link>
                  <Link href="/careers" className="btn-secondary">
                    Browse open roles
                  </Link>
                </div>
              </div>

              <div className="border-t border-stone-200 bg-[#f1eee5] p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.13em] text-stone-500">Your profile</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-.04em] text-navy-900">
                      {completion.percentage}%
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-300/70">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${completion.percentage}%` }} />
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-600">
                  {completion.missing.length
                    ? `Next: add ${completion.missing[0]}.`
                    : 'Your core profile information is complete.'}
                </p>
                <Link
                  href="/candidate/profile"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:underline"
                >
                  Review profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Applications sent', value: submitted, detail: 'Received by FRAD', icon: BriefcaseBusiness },
              { label: 'In progress', value: inProgress, detail: 'Still moving through recruitment', icon: Clock3 },
              {
                label: 'Unread messages',
                value: unreadMessages,
                detail: 'Updates from the recruitment team',
                icon: MessageSquareText,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="metric-card">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[.11em] text-stone-500">{label}</p>
                  <Icon className="h-4 w-4 text-brand-700" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900">{value}</p>
                <p className="mt-1 text-xs text-stone-500">{detail}</p>
              </div>
            ))}
          </div>

          {(actions.length > 0 || unreadMessages > 0) && (
            <section aria-labelledby="actions-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="actions-heading" className="text-lg font-semibold text-navy-900">
                    Waiting for you
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Deadlines and new messages that need a response.</p>
                </div>
                {unreadMessages > 0 && (
                  <Link href="/candidate/messages" className="text-xs font-bold text-brand-800 hover:underline">
                    {unreadMessages} unread
                  </Link>
                )}
              </div>
              <div className="grid gap-px bg-stone-200 md:grid-cols-2">
                {actions.map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="group flex items-center justify-between gap-4 bg-white p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.11em] text-brand-700">{action.type}</p>
                      <p className="mt-1 text-sm font-semibold text-navy-900">{action.label}</p>
                      <p className="mt-1 text-xs text-stone-500">{action.detail}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
                ))}
                {unreadMessages > 0 && (
                  <Link
                    href="/candidate/messages"
                    className="group flex items-center justify-between gap-4 bg-white p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.11em] text-brand-700">Messages</p>
                      <p className="mt-1 text-sm font-semibold text-navy-900">
                        You have {unreadMessages} new message{unreadMessages === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">Open your inbox to read the latest update.</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
                )}
              </div>
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
            <section aria-labelledby="applications-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="applications-heading" className="text-lg font-semibold text-navy-900">
                    Your applications
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Drafts and submitted applications, most recent first.</p>
                </div>
                <Link href="/candidate/applications" className="text-xs font-bold text-brand-800 hover:underline">
                  View all
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={FileText}
                    title="No applications yet"
                    description="When a role feels right, start an application and it will appear here."
                    action={{ href: '/careers', label: 'Explore open roles' }}
                  />
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {applications.slice(0, 5).map((application) => {
                    const status = candidateFacingStatus(application.internalStatus, application.candidateVisibleStatus)
                    const isDraft = status === 'APPLICATION_DRAFT'
                    const preboarding = application.preboardings[0]
                    return (
                      <Link
                        key={application.id}
                        href={
                          isDraft
                            ? `/candidate/applications/apply?vacancyId=${application.vacancy.id}`
                            : `/candidate/applications/${application.id}`
                        }
                        className="group block px-5 py-5 hover:bg-stone-50 sm:px-6"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-stone-500">
                                {application.vacancy.referenceNumber}
                              </span>
                              <span
                                className={`status-chip ${isDraft ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-brand-200 bg-brand-50 text-brand-800'}`}
                              >
                                {candidateStatusLabel(status)}
                              </span>
                            </div>
                            <h3 className="mt-2 truncate text-base font-semibold text-navy-900 group-hover:text-brand-800">
                              {application.vacancy.title}
                            </h3>
                            <p className="mt-1 text-xs text-stone-500">
                              {application.vacancy.department.name} · {application.vacancy.dutyStation.name},{' '}
                              {application.vacancy.dutyStation.state}
                            </p>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="text-xs font-semibold text-stone-700">
                              {isDraft ? 'Last saved' : 'Last updated'} {formatDate(application.updatedAt)}
                            </p>
                            {preboarding && (
                              <p className="mt-1 text-[11px] text-brand-700">
                                Preboarding {preboarding.overallCompletionPercentage}% complete
                              </p>
                            )}
                            <p className="mt-2 text-[11px] font-bold text-brand-800">
                              {isDraft ? 'Continue application' : 'Open application'} →
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="space-y-5">
              <NotificationInbox />
              <aside className="rounded-2xl border border-stone-200 bg-[#f1eee5] p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-700 shadow-sm">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-navy-900">Need to tell us something?</h2>
                    <p className="mt-1 text-xs leading-5 text-stone-600">
                      Ask a question, request an adjustment or report a problem from your account.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-brand-800">
                      <Link href="/candidate/messages" className="hover:underline">
                        Message FRAD
                      </Link>
                      <Link href="/candidate/accommodations" className="hover:underline">
                        Request an adjustment
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
