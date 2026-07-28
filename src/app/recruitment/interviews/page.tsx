import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Users, Video, MapPin, CalendarPlus } from 'lucide-react'
import InterviewManager, { PanelConfirmation } from '@/components/admin/InterviewManager'
import InterviewCoordinationActions from '@/components/admin/InterviewCoordinationActions'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function RecruitmentInterviewsPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  const canManage = await hasPermission(user.userId, 'interview.manage')
  const canScore = await hasPermission(user.userId, 'interview.score.assigned')
  if (!canManage && !canScore) redirect('/recruitment/dashboard')

  const interviews = await prisma.interview.findMany({
    where: canManage ? {} : { panelMembers: { some: { userId: user.userId } } },
    orderBy: { scheduledStart: 'desc' },
    include: {
      application: {
        include: {
          candidate: true,
          vacancy: { select: { title: true, referenceNumber: true } },
        },
      },
      panelMembers: { include: { user: { select: { email: true } } } },
      panelSubmissions: canManage ? true : { where: { panelMember: { userId: user.userId } } },
    },
    take: 100,
  })
  const [eligible, staffUsers] = await Promise.all([
    canManage
      ? prisma.application.findMany({
          where: { internalStatus: { in: ['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'] } },
          include: { candidate: true, vacancy: true },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.user.findMany({
          where: {
            userRoles: {
              some: { role: { name: { in: ['PANEL_MEMBER', 'HIRING_MANAGER', 'HR_MANAGER', 'RECRUITMENT_OFFICER'] } } },
            },
          },
          select: { id: true, email: true },
          orderBy: { email: 'asc' },
        })
      : Promise.resolve([]),
  ])
  const myPanels = interviews.flatMap((interview) =>
    interview.panelMembers
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
  )
  const questionsByInterview = await prisma.interviewQuestion.findMany({
    where: { interviewId: { in: myPanels.map((item) => item.interviewId) } },
    orderBy: { displayOrder: 'asc' },
  })
  for (const panel of myPanels)
    panel.questions = questionsByInterview
      .filter((q) => q.interviewId === panel.interviewId)
      .map((q) => ({ id: q.id, question: q.question, maximumScore: q.maximumScore }))

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          <div className="border-b border-slate-300 pb-5">
            <h1 className="text-3xl font-bold text-slate-900">Interviews</h1>
            <p className="mt-2 text-sm text-slate-600">
              {interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'} on record.
            </p>
          </div>

          <InterviewManager
            applications={eligible.map((a) => ({
              id: a.id,
              name: `${a.candidate.legalFirstName} ${a.candidate.lastName} — ${a.vacancy.title}`,
            }))}
            panelUsers={staffUsers}
            myPanels={myPanels}
            canSchedule={canManage}
          />

          <div className="space-y-3">
            {interviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No interviews have been scheduled yet.
              </div>
            ) : (
              interviews.map((iv) => {
                const c = iv.application.candidate
                const mayConfirmPanel =
                  canManage ||
                  iv.panelMembers.some((member) => member.userId === user.userId && member.panelRole === 'CHAIR')
                return (
                  <div
                    id={`interview-${iv.id}`}
                    key={iv.id}
                    className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {c.legalFirstName} {c.lastName} — {iv.application.vacancy.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          {iv.format === 'VIRTUAL' ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {iv.format}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {iv.panelMembers.length} panellists
                        </span>
                        <span>{formatDateTime(iv.scheduledStart)}</span>
                        {/* Panel members are the people most likely to want a
                            calendar entry; only candidates had this link. */}
                        <a
                          href={`/api/calendar/interviews/${iv.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand-700 underline"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Add to calendar
                        </a>
                      </p>
                      {mayConfirmPanel && iv.status === 'PANEL_REVIEW' && (
                        <PanelConfirmation interviewId={iv.id} varianceFlag={iv.varianceFlag} />
                      )}
                      {canManage && (
                        <InterviewCoordinationActions
                          interviewId={iv.id}
                          status={iv.status}
                          applicationStatus={iv.application.internalStatus}
                          scheduledStart={iv.scheduledStart.toISOString()}
                          scheduledEnd={iv.scheduledEnd.toISOString()}
                          panelMembers={iv.panelMembers.map((member) => ({
                            id: member.id,
                            email: member.user.email,
                            conflictStatus: member.conflictStatus,
                            conflictComment: member.conflictComment,
                            hasSubmitted: iv.panelSubmissions.some(
                              (submission) => submission.panelMemberId === member.id
                            ),
                          }))}
                        />
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(iv.status)}`}
                    >
                      {iv.status === 'PANEL_REVIEW'
                        ? 'Chair confirmation needed'
                        : iv.panelConfirmedAt
                          ? 'Panel confirmed'
                          : iv.panelSubmissions.length > 0
                            ? `${iv.panelSubmissions.length}/${iv.panelMembers.length} scorecards submitted`
                            : iv.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
