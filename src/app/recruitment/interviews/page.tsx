import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarPlus, MapPin, Users, Video } from 'lucide-react'
import InterviewManager, { PanelConfirmation } from '@/components/admin/InterviewManager'
import InterviewCoordinationActions from '@/components/admin/InterviewCoordinationActions'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { canMakeHrManagerDecision, canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'
import { formatDateTime, getStatusBadgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEWS = [
  ['action', 'Needs action'],
  ['upcoming', 'Upcoming'],
  ['history', 'History'],
] as const

export default async function RecruitmentInterviewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const [hasManagePermission, canScore] = await Promise.all([
    hasPermission(user.userId, 'interview.manage'),
    hasPermission(user.userId, 'interview.score.assigned'),
  ])
  const canCoordinate = hasManagePermission && canRunRecruitmentOperations(user.roles)
  if (!canCoordinate && !canScore) redirect('/recruitment/dashboard')

  const now = new Date()
  const interviews = await prisma.interview.findMany({
    where: canCoordinate ? {} : { panelMembers: { some: { userId: user.userId } } },
    orderBy: { scheduledStart: 'desc' },
    select: {
      id: true,
      applicationId: true,
      title: true,
      scheduledStart: true,
      scheduledEnd: true,
      timezone: true,
      format: true,
      venue: true,
      status: true,
      candidateResponse: true,
      panelConfirmedAt: true,
      varianceFlag: true,
      application: {
        select: {
          internalStatus: true,
          candidate: { select: { legalFirstName: true, lastName: true } },
          vacancy: { select: { title: true, referenceNumber: true } },
        },
      },
      panelMembers: {
        select: {
          id: true,
          userId: true,
          panelRole: true,
          conflictStatus: true,
          conflictComment: true,
          user: { select: { email: true } },
        },
      },
      panelSubmissions: {
        select: { id: true, panelMemberId: true, reopenedAt: true },
      },
    },
    take: 250,
  })

  const [eligible, staffUsers] = await Promise.all([
    canCoordinate
      ? prisma.application.findMany({
          where: {
            internalStatus: { in: ['SHORTLISTED', 'ASSESSMENT_COMPLETED'] },
            interviews: { none: { status: { not: 'CANCELLED' } } },
          },
          select: {
            id: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { title: true, referenceNumber: true } },
          },
          orderBy: { submittedAt: 'asc' },
          take: 250,
        })
      : Promise.resolve([]),
    canCoordinate
      ? prisma.user.findMany({
          where: {
            accountStatus: 'ACTIVE',
            userRoles: {
              some: { role: { name: { in: ['PANEL_MEMBER', 'HIRING_MANAGER', 'HR_MANAGER', 'RECRUITMENT_OFFICER'] } } },
            },
          },
          select: { id: true, email: true },
          orderBy: { email: 'asc' },
          take: 500,
        })
      : Promise.resolve([]),
  ])

  const myPanels = interviews.flatMap((interview) =>
    interview.scheduledStart <= now && interview.status !== 'CANCELLED'
      ? interview.panelMembers
          .filter((member) => {
            if (member.userId !== user.userId) return false
            const submission = interview.panelSubmissions.find((item) => item.panelMemberId === member.id)
            return !submission || Boolean(submission.reopenedAt)
          })
          .map((member) => ({
            interviewId: interview.id,
            panelMemberId: member.id,
            applicationId: interview.applicationId,
            candidate: `${interview.application.candidate.legalFirstName} ${interview.application.candidate.lastName}`,
            vacancy: interview.application.vacancy.title,
            title: interview.title,
            conflictStatus: member.conflictStatus,
            questions: [] as Array<{ id: string; question: string; maximumScore: number }>,
          }))
      : []
  )
  const questions = myPanels.length
    ? await prisma.interviewQuestion.findMany({
        where: { interviewId: { in: myPanels.map((item) => item.interviewId) } },
        select: { id: true, interviewId: true, question: true, maximumScore: true },
        orderBy: { displayOrder: 'asc' },
      })
    : []
  for (const panel of myPanels) {
    panel.questions = questions
      .filter((question) => question.interviewId === panel.interviewId)
      .map(({ id, question, maximumScore }) => ({ id, question, maximumScore }))
  }

  const needsAction = (interview: (typeof interviews)[number]) => {
    const assignedMember = interview.panelMembers.find((member) => member.userId === user.userId)
    const ownSubmission = assignedMember
      ? interview.panelSubmissions.find((submission) => submission.panelMemberId === assignedMember.id)
      : null
    const ownScoreDue =
      Boolean(assignedMember) &&
      interview.scheduledStart <= now &&
      (!ownSubmission || Boolean(ownSubmission.reopenedAt)) &&
      interview.status !== 'CANCELLED'
    const coordinationDue =
      canCoordinate &&
      (interview.status === 'PANEL_REVIEW' ||
        interview.candidateResponse === 'RESCHEDULE_REQUESTED' ||
        interview.panelMembers.some(
          (member) => member.conflictStatus !== 'NONE' && member.conflictStatus !== 'RESOLVED_EXCEPTION'
        ) ||
        ['SHORTLISTED', 'ASSESSMENT_COMPLETED'].includes(interview.application.internalStatus))
    return ownScoreDue || coordinationDue
  }
  const actionInterviews = interviews.filter(needsAction).sort((a, b) => +a.scheduledStart - +b.scheduledStart)
  const upcomingInterviews = interviews
    .filter(
      (interview) =>
        interview.scheduledEnd >= now && !['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(interview.status)
    )
    .sort((a, b) => +a.scheduledStart - +b.scheduledStart)
  const historyInterviews = interviews
    .filter(
      (interview) =>
        interview.scheduledEnd < now || ['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(interview.status)
    )
    .sort((a, b) => +b.scheduledStart - +a.scheduledStart)
  const requestedView = typeof query.view === 'string' ? query.view : 'action'
  const view = VIEWS.some(([value]) => value === requestedView) ? requestedView : 'action'
  const visibleInterviews =
    view === 'upcoming' ? upcomingInterviews : view === 'history' ? historyInterviews : actionInterviews
  const counts: Record<string, number> = {
    action: actionInterviews.length,
    upcoming: upcomingInterviews.length,
    history: historyInterviews.length,
  }
  const canResolveExceptions = canMakeHrManagerDecision(user.roles)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            title={canCoordinate ? 'Interviews' : 'Assigned interviews'}
            description={
              canCoordinate
                ? 'Schedule interviews, keep panels moving and collect independent scorecards.'
                : 'Review the application, declare any conflict and submit your scorecard.'
            }
          />

          <InterviewManager
            applications={eligible.map((application) => ({
              id: application.id,
              name: `${application.candidate.legalFirstName} ${application.candidate.lastName} · ${application.vacancy.referenceNumber} ${application.vacancy.title}`,
            }))}
            panelUsers={staffUsers}
            myPanels={myPanels}
            canSchedule={canCoordinate}
          />

          <section aria-labelledby="interview-register-heading" className="space-y-4">
            <div className="flex flex-col justify-between gap-4 border-b border-stone-300 sm:flex-row sm:items-end">
              <div className="pb-3">
                <h2 id="interview-register-heading" className="text-lg font-semibold text-navy-950">
                  Interview schedule
                </h2>
                <p className="mt-1 text-sm text-stone-600">Open a record only when coordination is needed.</p>
              </div>
              <nav aria-label="Interview views" className="flex gap-6">
                {VIEWS.map(([value, label]) => (
                  <Link
                    key={value}
                    href={`/recruitment/interviews?view=${value}`}
                    aria-current={view === value ? 'page' : undefined}
                    className={`border-b-2 pb-3 text-sm font-semibold ${
                      view === value
                        ? 'border-brand-700 text-navy-950'
                        : 'border-transparent text-stone-500 hover:text-navy-900'
                    }`}
                  >
                    {label} <span className="ml-1 text-xs font-normal">{counts[value]}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {visibleInterviews.length === 0 ? (
              <div className="section-panel px-6 py-12 text-center">
                <p className="text-sm font-semibold text-navy-950">
                  {view === 'action'
                    ? 'No interview work is waiting'
                    : view === 'upcoming'
                      ? 'No upcoming interviews'
                      : 'No interview history yet'}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {view === 'action'
                    ? 'New invitations, conflicts and scorecards will appear here.'
                    : 'Use the other views to see current records.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleInterviews.map((interview) => {
                  const candidate = interview.application.candidate
                  const mayConfirmPanel =
                    canCoordinate ||
                    interview.panelMembers.some(
                      (member) => member.userId === user.userId && member.panelRole === 'CHAIR'
                    )
                  const submittedCount = interview.panelSubmissions.filter((item) => !item.reopenedAt).length
                  return (
                    <article
                      id={`interview-${interview.id}`}
                      key={interview.id}
                      className="section-panel scroll-mt-24 overflow-hidden"
                    >
                      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(interview.status)}`}
                            >
                              {interview.status === 'PANEL_REVIEW'
                                ? 'Panel review'
                                : interview.status.replaceAll('_', ' ')}
                            </span>
                            {interview.candidateResponse && (
                              <span className="text-xs font-semibold text-stone-600">
                                Candidate: {interview.candidateResponse.replaceAll('_', ' ').toLowerCase()}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-navy-950">
                            {candidate.legalFirstName} {candidate.lastName}
                          </h3>
                          <p className="mt-1 text-sm text-stone-600">
                            {interview.application.vacancy.referenceNumber} · {interview.application.vacancy.title}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-navy-900">
                            {formatDateTime(interview.scheduledStart)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-500">
                            <span className="inline-flex items-center gap-1.5">
                              {interview.format === 'VIRTUAL' ? (
                                <Video className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <MapPin className="h-3.5 w-3.5" aria-hidden />
                              )}
                              {interview.format.toLowerCase()}
                              {interview.venue ? ` · ${interview.venue}` : ''}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {interview.panelMembers.length} panel member
                              {interview.panelMembers.length === 1 ? '' : 's'} · {submittedCount} submitted
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Link href={`/recruitment/applications/${interview.applicationId}`} className="btn-secondary">
                            Application
                          </Link>
                          <a href={`/api/calendar/interviews/${interview.id}`} className="btn-secondary">
                            <CalendarPlus className="h-4 w-4" aria-hidden />
                            Add to calendar
                          </a>
                        </div>
                      </div>
                      {mayConfirmPanel && interview.status === 'PANEL_REVIEW' && (
                        <div className="border-t border-stone-200 px-5 py-4 sm:px-6">
                          <PanelConfirmation interviewId={interview.id} varianceFlag={interview.varianceFlag} />
                        </div>
                      )}
                      {canCoordinate && (
                        <div className="border-t border-stone-200 px-5 py-4 sm:px-6">
                          <InterviewCoordinationActions
                            interviewId={interview.id}
                            status={interview.status}
                            applicationStatus={interview.application.internalStatus}
                            scheduledStart={interview.scheduledStart.toISOString()}
                            scheduledEnd={interview.scheduledEnd.toISOString()}
                            canResolveExceptions={canResolveExceptions}
                            canReopenScores={canResolveExceptions}
                            panelMembers={interview.panelMembers.map((member) => ({
                              id: member.id,
                              email: member.user.email,
                              conflictStatus: member.conflictStatus,
                              conflictComment: member.conflictComment,
                              hasSubmitted: interview.panelSubmissions.some(
                                (submission) => submission.panelMemberId === member.id && !submission.reopenedAt
                              ),
                            }))}
                          />
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
