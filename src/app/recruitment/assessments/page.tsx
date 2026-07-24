import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import AssessmentManager from '@/components/admin/AssessmentManager'
import { hasPermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export default async function RecruitmentAssessmentsPage() {
  const user = await getVerifiedUser()
  if (!user || (user.roles.includes('CANDIDATE') && !user.roles.some((r) => r !== 'CANDIDATE'))) {
    redirect('/auth/login')
  }
  if (!await hasPermission(user.userId, 'assessment.manage')) redirect('/recruitment/dashboard')

  const assessments = await prisma.assessment.findMany({
    include: {
      vacancy: { select: { title: true, referenceNumber: true } },
      candidateAssessments: { include: { application: { include: { candidate: true } } } },
      _count: { select: { questions: true, candidateAssessments: true } },
    },
    orderBy: { title: 'asc' },
    take: 100,
  })
  const [vacancies, eligibleApplications] = await Promise.all([
    prisma.vacancy.findMany({ where: { status: { in: ['OPEN','CLOSED'] } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.application.findMany({ where: { internalStatus: { in: ['SHORTLISTED','ASSESSMENT_INVITED'] } }, include: { candidate: true } }),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/recruitment/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="border-b border-slate-300 pb-5">
            <h1 className="text-3xl font-bold text-slate-900">Assessments</h1>
            <p className="mt-2 text-sm text-slate-600">{assessments.length} {assessments.length === 1 ? 'assessment' : 'assessments'} configured.</p>
          </div>

          <AssessmentManager vacancies={vacancies} eligible={eligibleApplications.map((a) => ({ id: a.id, name: `${a.candidate.legalFirstName} ${a.candidate.lastName}`, vacancyId: a.vacancyId }))} assessments={assessments.map((a) => ({ id: a.id, title: a.title, vacancyId: a.vacancyId, type: a.type }))} candidateAssessments={assessments.flatMap((assessment)=>assessment.candidateAssessments.map((record)=>({id:record.id,assessmentId:assessment.id,candidateName:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,status:record.status})))} />

          <div className="space-y-3">
            {assessments.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No assessments have been created yet. Configure them from a vacancy.
              </div>
            ) : (
              assessments.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                    <p className="text-xs text-slate-500">{a.vacancy.title} • {a.type} • {a._count.questions} questions • {a._count.candidateAssessments} candidate(s)</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">Pass mark {a.passMark}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
