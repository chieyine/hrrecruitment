import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

export const dynamic = 'force-dynamic'

export default async function RecruitmentPreboardingListPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (!await hasPermission(user.userId, 'preboarding.manage')) redirect('/recruitment/dashboard')

  const preboardings = await prisma.candidatePreboarding.findMany({
    include: {
      application: { include: { candidate: true, vacancy: { select: { title: true } } } },
      readinessChecks: true,
      forms: { select: { required: true, status: true, dueAt: true } },
      documents: { select: { required: true, status: true, dueAt: true } },
      courses: { select: { required: true, status: true, dueAt: true } },
      tasks: { select: { required: true, status: true, dueAt: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 100,
  })

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell space-y-7">
          <Link href="/recruitment/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <PageIntro
            eyebrow="Preboarding"
            title="New starter readiness"
            description={`${preboardings.length} ${preboardings.length === 1 ? 'candidate is' : 'candidates are'} in preboarding. Review outstanding requirements, due dates and HR clearance.`}
          />

          <div className="space-y-3">
            {preboardings.length === 0 ? (
              <EmptyState title="No candidates in preboarding" description="Candidates appear here after an accepted offer starts the preboarding process." />
            ) : (
              preboardings.map((pb) => {
                const c = pb.application.candidate
                const now = new Date()
                const overdue = [...pb.forms, ...pb.documents, ...pb.courses, ...pb.tasks].filter((item) => item.required && item.dueAt && item.dueAt < now && !['APPROVED', 'WAIVED', 'SIGNED', 'COMPLETED'].includes(item.status)).length
                const blockers = pb.readinessChecks.filter((check) => check.required && !['PASSED', 'WAIVED'].includes(check.status)).length
                return (
                  <div key={pb.id} className="section-panel flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.legalFirstName} {c.lastName} — {pb.application.vacancy.title}</h4>
                      <p className="text-xs text-slate-500">Completion {pb.overallCompletionPercentage}% · {blockers} readiness blocker{blockers === 1 ? '' : 's'} · <span className={overdue ? 'font-bold text-red-700' : ''}>{overdue} overdue</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(pb.readinessStatus)}`}>{pb.readinessStatus.replace(/_/g, ' ')}</span>
                    <Link href={`/recruitment/preboarding/${pb.id}`} className="btn-primary min-h-0 px-4 py-2 text-xs">
                      Review readiness <ArrowRight className="h-4 w-4" />
                    </Link>
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
