import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightLeft, Download } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro, EmptyState } from '@/components/ui/PageElements'
import ErpTransferApproval from '@/components/recruitment/ErpTransferApproval'

/**
 * §19 / §28.22 ERP handover monitoring.
 *
 * Transfer is manual, so "monitoring" means tracking who is waiting, who has an
 * approved pack ready to key in, and who is finished — not API retries.
 */
export default async function ErpTransfersPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'erp.transfer'))) redirect('/recruitment/dashboard')

  const [awaiting, records] = await Promise.all([
    // §19.1 candidates who have started but have no approval yet.
    prisma.application.findMany({
      where: { internalStatus: { in: ['RESUMED', 'READY_FOR_ERP_TRANSFER'] }, erpTransferRecord: null },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        internalStatus: true,
        candidate: { select: { legalFirstName: true, lastName: true } },
        vacancy: { select: { referenceNumber: true, title: true } },
        resumptionRecord: { select: { actualStartDate: true } },
      },
    }),
    prisma.eRPTransferRecord.findMany({
      orderBy: { approvedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        erpPersonnelNumber: true,
        transferStatus: true,
        approvedAt: true,
        approvedBy: true,
        createdInErpAt: true,
        handoverPackGeneratedAt: true,
        duplicateCheckStatus: true,
        duplicateCheckNote: true,
        application: {
          select: {
            id: true,
            referenceNumber: true,
            internalStatus: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { referenceNumber: true, title: true } },
          },
        },
      },
    }),
  ])

  const pendingNumber = records.filter((record) => record.transferStatus === 'APPROVED')
  const completed = records.filter((record) => record.erpPersonnelNumber !== null)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Offer and start"
            title="ERP handovers"
            description="Recruitment ends here. An approved handover pack carries every detail the ERP needs, and the recruitment record becomes read-only once the personnel number is recorded."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Awaiting approval</p>
              <p className="mt-1 text-2xl font-bold">{awaiting.length}</p>
            </div>
            <div className="border border-sky-300 bg-sky-50 px-5 py-4 text-sky-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Approved, awaiting ERP number</p>
              <p className="mt-1 text-2xl font-bold">{pendingNumber.length}</p>
            </div>
            <div className="border border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Completed</p>
              <p className="mt-1 text-2xl font-bold">{completed.length}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-950">Awaiting HR manager approval</h2>
            {awaiting.length === 0 ? (
              <p className="text-sm text-stone-600">Nobody is currently waiting for transfer approval.</p>
            ) : (
              <div className="divide-y divide-stone-200 border border-stone-300 bg-white">
                {awaiting.map((application) => (
                  <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <Link
                        href={`/recruitment/applications/${application.id}/handover`}
                        className="font-semibold text-brand-800 underline underline-offset-4"
                      >
                        {application.candidate.legalFirstName} {application.candidate.lastName}
                      </Link>
                      <span className="block text-xs text-stone-600">
                        {application.vacancy.referenceNumber} · {application.vacancy.title}
                        {application.resumptionRecord?.actualStartDate &&
                          ` · started ${new Date(application.resumptionRecord.actualStartDate).toLocaleDateString('en-GB')}`}
                      </span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {application.internalStatus.replaceAll('_', ' ').toLowerCase()}
                      <ErpTransferApproval applicationId={application.id} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {records.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No handovers recorded"
              description="Once a candidate has cleared pre-employment requirements and started, an HR manager approves the transfer and the handover pack becomes available."
            />
          ) : (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-stone-950">Handover register</h2>
              <div className="overflow-x-auto border border-stone-300 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="px-4 py-3">Person</th>
                      <th className="px-4 py-3">ERP number</th>
                      <th className="px-4 py-3">Duplicate check</th>
                      <th className="px-4 py-3">Approved</th>
                      <th className="px-4 py-3">Pack</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {records.map((record) => {
                      const awaitingNumber = record.erpPersonnelNumber === null
                      return (
                        <tr key={record.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/recruitment/applications/${record.application.id}/handover`}
                              className="font-semibold text-brand-800 underline underline-offset-4"
                            >
                              {record.application.candidate.legalFirstName} {record.application.candidate.lastName}
                            </Link>
                            <span className="block text-xs text-stone-600">
                              {record.application.vacancy.referenceNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-800">
                            {awaitingNumber ? (
                              <span className="text-amber-800">Awaiting ERP number</span>
                            ) : (
                              record.erpPersonnelNumber
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span
                              className={
                                record.duplicateCheckStatus === 'OVERRIDDEN'
                                  ? 'font-semibold text-amber-800'
                                  : 'text-stone-600'
                              }
                            >
                              {record.duplicateCheckStatus.replaceAll('_', ' ').toLowerCase()}
                            </span>
                            {record.duplicateCheckNote && (
                              <span className="block text-stone-500">{record.duplicateCheckNote}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-600">
                            {record.approvedAt ? new Date(record.approvedAt).toLocaleDateString('en-GB') : 'Not approved'}
                          </td>
                          <td className="px-4 py-3">
                            {record.approvedAt ? (
                              <a
                                href={`/api/recruitment/applications/${record.application.id}/erp-transfer/pack`}
                                className="btn-secondary"
                              >
                                <Download className="h-4 w-4" />
                                Pack
                              </a>
                            ) : (
                              <span className="text-xs text-stone-500">Approval required</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
