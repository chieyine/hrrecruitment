import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass, formatDate } from '@/lib/utils'
import { ArrowLeft, FileSignature } from 'lucide-react'
import OfferManager, { OfferActions } from '@/components/admin/OfferManager'
import { hasPermission } from '@/lib/rbac'
import OfferCorrection from '@/components/admin/OfferCorrection'
import { hasStaffRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function RecruitmentOffersPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (!await hasPermission(user.userId, 'offer.manage')) redirect('/recruitment/dashboard')

  const offers = await prisma.offer.findMany({
    orderBy: { startDate: 'desc' },
    include: { application: { include: { candidate: true } } },
    take: 100,
  })
  const eligible = await prisma.application.findMany({ where: { internalStatus: { in: ['RECOMMENDED', 'OFFER_DRAFT'] }, offers: { none: { status: { notIn: ['DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'] } } } }, include: { candidate: true, vacancy: { include: { dutyStation: true } } } })
  const templates = await prisma.offerTemplate.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const candidates = eligible.map((application) => ({ id: application.id, name: `${application.candidate.legalFirstName} ${application.candidate.lastName}`, position: application.vacancy.title, dutyStation: application.vacancy.dutyStation.name, contractType: application.vacancy.contractType }))

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/recruitment/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <FileSignature className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Job Offers</h1>
              <p className="text-sm text-slate-600">{offers.length} offer(s) issued.</p>
            </div>
          </div>

          <OfferManager candidates={candidates} templates={templates} />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Candidate</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Position</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Start</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Deadline</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No offers issued yet.</td></tr>
                ) : (
                  offers.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{o.application.candidate.legalFirstName} {o.application.candidate.lastName}</td>
                      <td className="px-4 py-3 text-slate-600">{o.position}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.startDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.acceptanceDeadline)}</td>
                      <td className="px-4 py-3 space-y-2"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(o.status)}`}>{o.status}</span><OfferActions id={o.id} status={o.status} /><OfferCorrection
                        offerId={o.id}
                        status={o.status}
                        current={{
                          position: o.position,
                          salary: o.salary,
                          startDate: o.startDate.toISOString(),
                          endDate: o.endDate ? o.endDate.toISOString() : null,
                          acceptanceDeadline: o.acceptanceDeadline.toISOString(),
                          probationPeriod: o.probationPeriod,
                          reportingLine: o.reportingLine,
                          conditions: o.conditions,
                          contractDuration: o.contractDuration,
                        }}
                      /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
