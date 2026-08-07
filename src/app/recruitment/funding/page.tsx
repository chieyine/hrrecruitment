import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro, EmptyState } from '@/components/ui/PageElements'
import { staffingRequestStatusLabel } from '@/lib/staffing-request'

/**
 * §22.3 The Budget Holder dashboard.
 *
 * Deliberately narrow: requests awaiting funding, what the Budget Holder has
 * already committed, offer variations needing re-confirmation, and funding end
 * dates approaching. No candidate data appears here at all (§3.7).
 */
export default async function FundingPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  const [canConfirm, canRead] = await Promise.all([
    hasPermission(user.userId, 'funding.confirm'),
    hasPermission(user.userId, 'funding.read'),
  ])
  if (!canConfirm && !canRead) redirect('/recruitment/dashboard')

  const soon = new Date()
  soon.setMonth(soon.getMonth() + 3)

  const [awaiting, myDecisions, offerVariations, endingSoon] = await Promise.all([
    prisma.staffingRequest.findMany({
      where: { status: 'AWAITING_FUNDING_CONFIRMATION' },
      orderBy: { submittedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        referenceNumber: true,
        positionTitle: true,
        numberOfPositions: true,
        jobGrade: true,
        budgetLine: true,
        fundingSource: true,
        proposedSalaryCeiling: true,
        urgency: true,
        expectedStartDate: true,
        submittedAt: true,
        department: { select: { name: true } },
        project: { select: { name: true, code: true } },
      },
    }),
    prisma.fundingConfirmation.findMany({
      where: { budgetHolderUserId: user.userId },
      orderBy: { decidedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        decision: true,
        budgetLine: true,
        salaryCeilingAmount: true,
        salaryCeilingCurrency: true,
        fundingEndDate: true,
        decidedAt: true,
        supersededAt: true,
        staffingRequest: {
          select: { id: true, referenceNumber: true, positionTitle: true, status: true },
        },
      },
    }),
    // §17 offers that exceed the confirmed ceiling and need re-confirmation.
    prisma.offer.findMany({
      where: { exceedsApprovedCeiling: true, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
      orderBy: { startDate: 'asc' },
      take: 50,
      select: {
        id: true,
        position: true,
        salaryAmount: true,
        salaryCurrency: true,
        budgetLine: true,
        startDate: true,
        status: true,
        application: { select: { id: true, vacancy: { select: { referenceNumber: true, title: true } } } },
        financialApprovals: { orderBy: { decidedAt: 'desc' }, take: 1, select: { decision: true, decidedAt: true } },
      },
    }),
    prisma.fundingConfirmation.findMany({
      where: { supersededAt: null, decision: 'CONFIRMED', fundingEndDate: { not: null, lte: soon } },
      orderBy: { fundingEndDate: 'asc' },
      take: 50,
      select: {
        id: true,
        fundingEndDate: true,
        budgetLine: true,
        staffingRequest: { select: { id: true, referenceNumber: true, positionTitle: true } },
      },
    }),
  ])

  const money = (amount: { toString(): string } | null, currency?: string | null) =>
    amount ? `${currency || 'NGN'} ${Number(amount.toString()).toLocaleString('en-GB')}` : 'Not set'

  const card = (label: string, value: number, tone: string) => (
    <div className={`border px-5 py-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Plan and fund"
            title="Funding decisions"
            description="Positions cannot be advertised until the budget holder has confirmed the money, the budget line and the ceiling."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            {card('Awaiting your decision', awaiting.length, 'border-amber-300 bg-amber-50 text-amber-950')}
            {card('Offer variations', offerVariations.length, 'border-violet-300 bg-violet-50 text-violet-950')}
            {card('Funding ending within 3 months', endingSoon.length, 'border-stone-300 bg-white text-stone-900')}
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-950">Staffing requests awaiting funding confirmation</h2>
            {awaiting.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Nothing waiting on you"
                description="Staffing requests appear here as soon as a department submits them for funding confirmation."
              />
            ) : (
              <div className="overflow-x-auto border border-stone-300 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Budget line</th>
                      <th className="px-4 py-3">Proposed ceiling</th>
                      <th className="px-4 py-3">Needed by</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {awaiting.map((request) => (
                      <tr key={request.id} className={request.urgency === 'EMERGENCY' ? 'bg-rose-50' : undefined}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-stone-950">{request.positionTitle}</span>
                          <span className="block text-xs text-stone-600">
                            {request.referenceNumber} · × {request.numberOfPositions} · grade {request.jobGrade}
                            {request.urgency === 'EMERGENCY' && ' · EMERGENCY'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-800">
                          {request.department.name}
                          {request.project && (
                            <span className="block text-xs text-stone-600">{request.project.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-800">{request.budgetLine}</td>
                        <td className="px-4 py-3 text-stone-800">{request.proposedSalaryCeiling || 'Not stated'}</td>
                        <td className="px-4 py-3 text-stone-800">
                          {new Date(request.expectedStartDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href="/recruitment/staffing-requests" className="btn-secondary">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {offerVariations.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-stone-950">Offers above the approved ceiling</h2>
              <p className="text-sm text-stone-600">
                These offers exceed the ceiling you confirmed and need your re-confirmation before HR can approve them.
              </p>
              <div className="divide-y divide-stone-200 border border-stone-300 bg-white">
                {offerVariations.map((offer) => (
                  <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold text-stone-950">{offer.position}</span>
                      <span className="block text-xs text-stone-600">
                        {offer.application.vacancy.referenceNumber} · {money(offer.salaryAmount, offer.salaryCurrency)}
                        {offer.budgetLine && ` · ${offer.budgetLine}`}
                      </span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                      {offer.financialApprovals[0]?.decision ?? 'Awaiting your decision'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-950">Your funding decisions</h2>
            {myDecisions.length === 0 ? (
              <p className="text-sm text-stone-600">You have not recorded any funding decisions yet.</p>
            ) : (
              <div className="divide-y divide-stone-200 border border-stone-300 bg-white">
                {myDecisions.map((decision) => (
                  <div key={decision.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold text-stone-950">{decision.staffingRequest.positionTitle}</span>
                      <span className="block text-xs text-stone-600">
                        {decision.staffingRequest.referenceNumber} ·{' '}
                        {money(decision.salaryCeilingAmount, decision.salaryCeilingCurrency)}
                        {decision.budgetLine && ` · ${decision.budgetLine}`}
                        {decision.supersededAt && ' · superseded'}
                      </span>
                    </span>
                    <span className="text-xs text-stone-600">
                      {decision.decision.toLowerCase()} on{' '}
                      {new Date(decision.decidedAt).toLocaleDateString('en-GB')} ·{' '}
                      {staffingRequestStatusLabel(decision.staffingRequest.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {endingSoon.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-stone-950">Funding ending soon</h2>
              <div className="divide-y divide-stone-200 border border-stone-300 bg-white">
                {endingSoon.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-semibold text-stone-950">{item.staffingRequest.positionTitle}</span>
                    <span className="text-xs text-stone-600">
                      {item.budgetLine} · ends{' '}
                      {item.fundingEndDate ? new Date(item.fundingEndDate).toLocaleDateString('en-GB') : 'unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
