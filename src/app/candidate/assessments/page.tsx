import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import AssessmentSubmissionReview from '@/components/shared/AssessmentSubmissionReview'

export const dynamic = 'force-dynamic'

export default async function CandidateAssessmentsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const assessments = await prisma.candidateAssessment.findMany({
    where: { application: { candidate: { userId: user.userId } } },
    include: { assessment: { include: { vacancy: { select: { title: true } } } } },
    orderBy: { invitedAt: 'desc' },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Assessments</h1>
            </div>

            {assessments.length === 0 ? (
              <p className="text-sm text-slate-500">You have no assigned assessments.</p>
            ) : (
              assessments.map((ca) => {
                const done = ['SUBMITTED', 'AUTO_SUBMITTED', 'MARKED', 'PASSED', 'FAILED'].includes(ca.status)
                return (
                  <div key={ca.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{ca.assessment.title}</h3>
                        <p className="text-xs text-slate-500">
                          {ca.assessment.vacancy.title}
                          {ca.score != null ? ` • Score ${ca.score}%` : ''}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(ca.status)}`}
                      >
                        {ca.status}
                      </span>
                    </div>
                    {!done ? (
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={`/candidate/assessments/${ca.id}`}
                          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-700"
                        >
                          Start Assessment →
                        </Link>
                      </div>
                    ) : (
                      <AssessmentSubmissionReview candidateAssessmentId={ca.id} />
                    )}
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
