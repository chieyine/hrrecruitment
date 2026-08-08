import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import AssessmentManager from '@/components/admin/AssessmentManager'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function RecruitmentAssessmentsPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (!(await hasPermission(user.userId, 'assessment.manage'))) redirect('/recruitment/dashboard')

  const assessments = await prisma.assessment.findMany({
    include: {
      vacancy: { select: { title: true, referenceNumber: true } },
      candidateAssessments: { include: { application: { include: { candidate: true } } } },
      _count: { select: { questions: true, candidateAssessments: true } },
    },
    orderBy: { title: 'asc' },
    take: 100,
  })
  const [vacancies, eligibleApplications, reviewers] = await Promise.all([
    prisma.vacancy.findMany({
      where: { status: { notIn: ['CANCELLED', 'COMPLETED', 'ARCHIVED'] } },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    prisma.application.findMany({
      where: { internalStatus: 'SHORTLISTED', candidateAssessments: { none: {} } },
      include: { candidate: true },
    }),
    prisma.user.findMany({ where: { accountStatus: 'ACTIVE', userRoles: { some: { role: { name: { in: ['RECRUITMENT_OFFICER', 'HR_MANAGER', 'HIRING_MANAGER'] } } } } }, select: { id: true, email: true }, orderBy: { email: 'asc' }, take: 500 }),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="border-b border-stone-300 pb-6">
            <p className="text-sm font-medium text-brand-800">Selection tools</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Assessments</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Invite shortlisted candidates, mark completed work and manage the assessment used for each vacancy.
            </p>
          </div>

          <AssessmentManager
            vacancies={vacancies}
            eligible={eligibleApplications.map((a) => ({
              id: a.id,
              name: `${a.candidate.legalFirstName} ${a.candidate.lastName}`,
              vacancyId: a.vacancyId,
            }))}
            assessments={assessments.map((a) => ({
              id: a.id,
              title: a.title,
              vacancyId: a.vacancyId,
              type: a.type,
              description: a.description,
              durationMinutes: a.durationMinutes,
              passMark: a.passMark,
              maximumAttempts: a.maximumAttempts,
              opensAt: a.opensAt,
              closesAt: a.closesAt,
              randomizeQuestions: a.randomizeQuestions,
              autoSubmit: a.autoSubmit,
              candidateCount: a._count.candidateAssessments,
              questionCount: a._count.questions,
            }))}
            candidateAssessments={assessments.flatMap((assessment) =>
              assessment.candidateAssessments.map((record) => ({
                id: record.id,
                assessmentId: assessment.id,
                candidateName: `${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,
                status: record.status,
                assessmentType: assessment.type,
                markerUserId: record.markerUserId,
                assignedReviewerUserId: record.assignedReviewerUserId,
                score: record.score,
              }))
            )}
            currentUserId={user.userId}
            reviewers={reviewers}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
