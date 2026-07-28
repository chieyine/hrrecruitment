import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, UserCheck } from 'lucide-react'
import ReferenceManager, { ReferenceActions, VerifyReferenceResponse } from '@/components/admin/ReferenceManager'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function RecruitmentReferencesPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (!(await hasPermission(user.userId, 'reference.manage'))) redirect('/recruitment/dashboard')

  const referees = await prisma.referee.findMany({
    orderBy: { name: 'asc' },
    include: {
      application: { include: { candidate: true, vacancy: { select: { title: true } } } },
      requests: { include: { response: true } },
    },
    take: 100,
  })
  const applications = await prisma.application.findMany({
    where: { internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
    include: { candidate: true, vacancy: true },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-brand-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reference Checks</h1>
              <p className="text-sm text-slate-600">{referees.length} referee(s) on record.</p>
            </div>
          </div>

          <ReferenceManager
            applications={applications.map((a) => ({
              id: a.id,
              name: `${a.candidate.legalFirstName} ${a.candidate.lastName} — ${a.vacancy.title}`,
            }))}
          />

          <div className="space-y-3">
            {referees.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No referees have been added yet.
              </div>
            ) : (
              referees.map((r) => {
                const latest = r.requests[r.requests.length - 1]
                const status =
                  r.contactStatus !== 'READY'
                    ? r.contactStatus
                    : latest?.response
                      ? latest.response.outcome
                      : latest?.status || 'PENDING'
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {r.name} — {r.organization}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Referee for {r.application.candidate.legalFirstName} {r.application.candidate.lastName} ·{' '}
                        {r.application.vacancy.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Preferred contact: {r.preferredContactMethod.toLowerCase()}
                        {r.waiverReason ? ` · Waiver: ${r.waiverReason}` : ''}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(status)}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                      {r.contactStatus === 'READY' && r.preferredContactMethod === 'EMAIL' && (
                        <ReferenceActions
                          id={r.id}
                          hasActive={!!latest && !latest.response && ['PENDING', 'SENT'].includes(latest.status)}
                        />
                      )}
                      {r.contactStatus === 'READY' && r.preferredContactMethod === 'PHONE' && (
                        <span className="block text-xs font-semibold text-brand-700">
                          Record verified call outcome above
                        </span>
                      )}
                      {latest?.response && !latest.response.verifiedAt && (
                        <VerifyReferenceResponse responseId={latest.response.id} />
                      )}{' '}
                      {latest?.response?.verifiedAt && (
                        <span className="block text-xs font-semibold text-emerald-700">Verified by staff</span>
                      )}
                    </div>
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
