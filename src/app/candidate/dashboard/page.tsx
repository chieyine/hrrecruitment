import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, MessageSquareText, UserRound } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { profileCompletion } from '@/lib/profile-completion'
import { candidateFacingStatus, candidateStatusLabel } from '@/lib/candidate-status'
import { getCandidateTasks } from '@/lib/candidate-tasks'
import { homeRouteForRoles } from '@/lib/home-route'

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
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))

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

  const [applications, tasks] = await Promise.all([
    profile
      ? prisma.application.findMany({
          where: { candidateId: profile.id },
          include: {
            vacancy: { include: { department: true, dutyStation: true } },
            preboardings: { include: { readinessConfirmation: true } },
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
      : Promise.resolve([]),
    getCandidateTasks(user.userId),
  ])

  const completion = profileCompletion(profile)
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
  const nextTask = tasks[0]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft">
            <div className="grid lg:grid-cols-[1.45fr_.55fr]">
              <div className="px-6 py-8 sm:px-8 sm:py-10">
                <p className="text-sm font-semibold text-brand-800">Hello, {displayName}</p>
                <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-.04em] text-navy-900 sm:text-4xl">
                  {nextTask
                    ? `${tasks.length} ${tasks.length === 1 ? 'thing needs' : 'things need'} your attention.`
                    : 'You are up to date.'}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
                  {nextTask
                    ? `Start with “${nextTask.title}”.`
                    : 'There is nothing you need to complete right now. You can still check an application or look for another role.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {nextTask ? (
                    <Link href={nextTask.href} className="btn-primary">
                      Open next task <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link href="/candidate/applications" className="btn-primary">
                      View applications <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  <Link href="/careers" className="btn-secondary">
                    Find a role
                  </Link>
                </div>
              </div>

              <div className="border-t border-stone-200 bg-[#f1eee5] p-6 lg:border-l lg:border-t-0 lg:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-600">Profile</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-.04em] text-navy-900">
                      {completion.percentage}%
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </span>
                </div>
                <div
                  className="mt-5 h-1.5 overflow-hidden rounded-full bg-stone-300/70"
                  aria-label={`Profile ${completion.percentage}% complete`}
                >
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${completion.percentage}%` }} />
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-600">
                  {completion.missing.length
                    ? `Add ${completion.missing[0]} when you are ready.`
                    : 'Your main profile details are complete.'}
                </p>
                <Link
                  href="/candidate/profile"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:underline"
                >
                  Open profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid border-t border-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-stone-200">
              {[
                ['Applications sent', submitted],
                ['Still in progress', inProgress],
                ['Unread messages', unreadMessages],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-b border-stone-100 px-6 py-4 last:border-b-0 sm:border-b-0"
                >
                  <p className="text-xs font-semibold text-stone-600">{label}</p>
                  <p className="text-lg font-semibold text-navy-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {tasks.length > 0 && (
            <section aria-labelledby="tasks-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="tasks-heading" className="text-lg font-semibold text-navy-900">
                    To do
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">The most urgent item is first.</p>
                </div>
                <Link href="/candidate/tasks" className="text-xs font-bold text-brand-800 hover:underline">
                  See all {tasks.length}
                </Link>
              </div>
              <div className="divide-y divide-stone-100">
                {tasks.slice(0, 4).map((task, index) => (
                  <Link
                    key={task.key}
                    href={task.href}
                    className="group grid gap-3 px-5 py-4 hover:bg-stone-50 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy-900">{task.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {task.context}
                        {task.dueAt ? ` · Due ${formatDate(task.dueAt)}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
            <section aria-labelledby="applications-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="applications-heading" className="text-lg font-semibold text-navy-900">
                    Applications
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Your latest applications and their current status.</p>
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
                    description="Open a role to read the details and start an application."
                    action={{ href: '/careers', label: 'View open roles' }}
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
                                className={`status-chip ${
                                  isDraft
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'border-brand-200 bg-brand-50 text-brand-800'
                                }`}
                              >
                                {candidateStatusLabel(status)}
                              </span>
                            </div>
                            <h3 className="mt-2 truncate text-base font-semibold text-navy-900 group-hover:text-brand-800">
                              {application.vacancy.title}
                            </h3>
                            <p className="mt-1 text-xs text-stone-500">
                              {application.vacancy.department.name} · {application.vacancy.dutyStation.name}
                            </p>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="text-xs font-semibold text-stone-700">
                              {isDraft ? 'Saved' : 'Updated'} {formatDate(application.updatedAt)}
                            </p>
                            {preboarding && (
                              <p className="mt-1 text-[11px] text-brand-700">
                                Starting steps {preboarding.overallCompletionPercentage}% complete
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <Link
                href="/candidate/messages"
                className="group block rounded-2xl border border-stone-200 bg-white p-5 shadow-soft hover:border-brand-300"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-navy-900">Messages</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {unreadMessages
                    ? `${unreadMessages} unread ${unreadMessages === 1 ? 'message' : 'messages'} from the recruitment team.`
                    : 'Ask a question or read an update from the recruitment team.'}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-800">
                  Open messages <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>

              <div className="rounded-2xl border border-stone-200 bg-[#f1eee5] p-5">
                <CheckCircle2 className="h-5 w-5 text-brand-700" />
                <h2 className="mt-3 text-sm font-semibold text-navy-900">Need an adjustment?</h2>
                <p className="mt-1 text-xs leading-5 text-stone-600">
                  Tell us what would help you take part in an interview or assessment.
                </p>
                <Link
                  href="/candidate/accommodations"
                  className="mt-3 inline-flex text-xs font-bold text-brand-800 hover:underline"
                >
                  Request an adjustment
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
