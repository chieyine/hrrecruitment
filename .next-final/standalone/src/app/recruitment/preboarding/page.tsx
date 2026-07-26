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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/recruitment/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">Preboarding &amp; Readiness</span>
            <h1 className="text-3xl font-extrabold mt-2">Preboarding Control Tower</h1>
            <p className="text-slate-300 text-sm mt-1">{preboardings.length} candidate(s), with blockers, deadlines, and final clearance evidence in one view.</p>
          </div>

          <div className="space-y-3">
            {preboardings.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No candidates are in preboarding yet.
              </div>
            ) : (
              preboardings.map((pb) => {
                const c = pb.application.candidate
                const now = new Date()
                const overdue = [...pb.forms, ...pb.documents, ...pb.courses, ...pb.tasks].filter((item) => item.required && item.dueAt && item.dueAt < now && !['APPROVED', 'WAIVED', 'SIGNED', 'COMPLETED'].includes(item.status)).length
                const blockers = pb.readinessChecks.filter((check) => check.required && !['PASSED', 'WAIVED'].includes(check.status)).length
                return (
                  <div key={pb.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.legalFirstName} {c.lastName} — {pb.application.vacancy.title}</h4>
                      <p className="text-xs text-slate-500">Completion {pb.overallCompletionPercentage}% · {blockers} readiness blocker{blockers === 1 ? '' : 's'} · <span className={overdue ? 'font-bold text-red-700' : ''}>{overdue} overdue</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(pb.readinessStatus)}`}>{pb.readinessStatus.replace(/_/g, ' ')}</span>
                    <Link href={`/recruitment/preboarding/${pb.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700">
                      Open Clearance <ArrowRight className="h-4 w-4" />
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
