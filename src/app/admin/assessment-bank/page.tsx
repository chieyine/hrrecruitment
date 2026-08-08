import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import AssessmentBankManager from '@/components/admin/AssessmentBankManager'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export default async function AssessmentBankPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'assessment.manage'))) redirect('/recruitment/dashboard')
  const [questions, assessments] = await Promise.all([
    prisma.assessmentBankQuestion.findMany({
      orderBy: [{ status: 'asc' }, { category: 'asc' }, { title: 'asc' }, { version: 'desc' }],
      take: 1000,
    }),
    prisma.assessment.findMany({
      where: { candidateAssessments: { none: {} } },
      select: { id: true, title: true, vacancy: { select: { referenceNumber: true } } },
      orderBy: { title: 'asc' },
      take: 200,
    }),
  ])
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Selection tools"
            title="Assessment question bank"
            description="Keep approved questions in one controlled library, with clear ownership, review dates and version history."
          />
          <AssessmentBankManager questions={questions} assessments={assessments} currentUserId={user.userId} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
