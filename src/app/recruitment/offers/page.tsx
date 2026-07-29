import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, FileSignature } from 'lucide-react'
import OfferManager, { OfferActions } from '@/components/admin/OfferManager'
import OfferCorrection from '@/components/admin/OfferCorrection'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const COMPLETE_STATUSES = ['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED']

export default async function RecruitmentOffersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'offer.manage')))
    redirect('/recruitment/dashboard')

  const [offers, eligible, templates] = await Promise.all([
    prisma.offer.findMany({
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        applicationId: true,
        position: true,
        dutyStation: true,
        contractType: true,
        contractDuration: true,
        salary: true,
        startDate: true,
        endDate: true,
        acceptanceDeadline: true,
        probationPeriod: true,
        reportingLine: true,
        conditions: true,
        status: true,
        sentAt: true,
        viewedAt: true,
        acceptedAt: true,
        declinedAt: true,
        candidateComment: true,
        offerFileId: true,
        application: {
          select: {
            referenceNumber: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { referenceNumber: true } },
          },
        },
      },
      take: 250,
    }),
    prisma.application.findMany({
      where: {
        internalStatus: 'RECOMMENDED',
        selectionDecisions: { some: { outcome: 'SELECTED', approvedAt: { not: null } } },
        offers: { none: { status: { notIn: COMPLETE_STATUSES } } },
      },
      select: {
        id: true,
        candidate: { select: { legalFirstName: true, lastName: true } },
        vacancy: {
          select: {
            title: true,
            referenceNumber: true,
            contractType: true,
            dutyStation: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 250,
    }),
    prisma.offerTemplate.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const openOffers = offers
    .filter((offer) => !COMPLETE_STATUSES.includes(offer.status))
    .sort((a, b) => {
      const priority = (status: string) =>
        status === 'APPROVED' ? 0 : status === 'DRAFT' ? 1 : status === 'PENDING_APPROVAL' ? 2 : 3
      return priority(a.status) - priority(b.status) || +a.acceptanceDeadline - +b.acceptanceDeadline
    })
  const closedOffers = offers
    .filter((offer) => COMPLETE_STATUSES.includes(offer.status))
    .sort(
      (a, b) =>
        +(b.acceptedAt || b.declinedAt || b.sentAt || b.startDate) -
        +(a.acceptedAt || a.declinedAt || a.sentAt || a.startDate)
    )
  const view = query.view === 'history' ? 'history' : 'open'
  const visibleOffers = view === 'history' ? closedOffers : openOffers
  const candidates = eligible.map((application) => ({
    id: application.id,
    name: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
    position: application.vacancy.title,
    dutyStation: application.vacancy.dutyStation.name,
    contractType: application.vacancy.contractType,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            title="Offers"
            description="Prepare the letter, obtain approval, issue the PDF and follow the candidate’s response."
          />

          {candidates.length > 0 && (
            <details className="section-panel">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-950 sm:px-6 [&::-webkit-details-marker]:hidden">
                Prepare an offer
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {candidates.length} approved selection{candidates.length === 1 ? '' : 's'} ready
                </span>
              </summary>
              <div className="border-t border-stone-200">
                <OfferManager candidates={candidates} templates={templates} embedded />
              </div>
            </details>
          )}

          <section aria-labelledby="offer-list-heading" className="space-y-4">
            <div className="flex flex-col justify-between gap-4 border-b border-stone-300 sm:flex-row sm:items-end">
              <div className="pb-3">
                <h2 id="offer-list-heading" className="text-lg font-semibold text-navy-950">
                  {view === 'open' ? 'Offers in progress' : 'Offer history'}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {view === 'open'
                    ? 'Approved letters ready to issue are shown first.'
                    : 'Accepted, declined, expired, withdrawn and replaced offers.'}
                </p>
              </div>
              <nav aria-label="Offer views" className="flex gap-6">
                <Link
                  href="/recruitment/offers"
                  aria-current={view === 'open' ? 'page' : undefined}
                  className={`border-b-2 pb-3 text-sm font-semibold ${
                    view === 'open' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'
                  }`}
                >
                  In progress <span className="ml-1 text-xs font-normal">{openOffers.length}</span>
                </Link>
                <Link
                  href="/recruitment/offers?view=history"
                  aria-current={view === 'history' ? 'page' : undefined}
                  className={`border-b-2 pb-3 text-sm font-semibold ${
                    view === 'history' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'
                  }`}
                >
                  History <span className="ml-1 text-xs font-normal">{closedOffers.length}</span>
                </Link>
              </nav>
            </div>

            {visibleOffers.length === 0 ? (
              <EmptyState
                icon={FileSignature}
                title={view === 'open' ? 'No offers in progress' : 'No completed offers'}
                description={
                  view === 'open'
                    ? candidates.length
                      ? 'Use “Prepare an offer” when you are ready.'
                      : 'An approved selection will appear here when it is ready for offer preparation.'
                    : 'Completed offer outcomes will be kept here.'
                }
              />
            ) : (
              <div className="space-y-3">
                {visibleOffers.map((offer) => {
                  const candidate = offer.application.candidate
                  return (
                    <article key={offer.id} className="section-panel overflow-hidden">
                      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(offer.status)}`}
                            >
                              {offer.status.replaceAll('_', ' ')}
                            </span>
                            <span className="text-xs text-stone-500">{offer.application.vacancy.referenceNumber}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-navy-950">
                            {candidate.legalFirstName} {candidate.lastName}
                          </h3>
                          <p className="mt-1 text-sm text-stone-600">
                            {offer.position} · {offer.dutyStation}
                          </p>
                          <dl className="mt-4 grid max-w-3xl gap-4 text-sm sm:grid-cols-3">
                            <div>
                              <dt className="text-xs text-stone-500">Compensation</dt>
                              <dd className="mt-1 font-semibold text-navy-950">{offer.salary}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-stone-500">Start date</dt>
                              <dd className="mt-1 font-semibold text-navy-950">{formatDate(offer.startDate)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-stone-500">Response due</dt>
                              <dd className="mt-1 font-semibold text-navy-950">
                                {formatDate(offer.acceptanceDeadline)}
                              </dd>
                            </div>
                          </dl>
                          {offer.candidateComment && COMPLETE_STATUSES.includes(offer.status) && (
                            <p className="mt-4 border-l-2 border-stone-300 pl-3 text-sm text-stone-600">
                              {offer.candidateComment}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap content-start gap-2 lg:max-w-72 lg:justify-end">
                          <Link href={`/recruitment/applications/${offer.applicationId}`} className="btn-secondary">
                            Application
                          </Link>
                          {offer.offerFileId ? (
                            <a
                              href={`/api/assets/download/${offer.offerFileId}?disposition=inline`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary"
                            >
                              Issued PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          ) : (
                            <a
                              href={`/api/recruitment/offers/${offer.id}/preview`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary"
                            >
                              Preview PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          )}
                          <OfferActions
                            id={offer.id}
                            status={offer.status}
                            canWithdraw={user.roles.includes('HR_MANAGER')}
                          />
                        </div>
                      </div>
                      {!COMPLETE_STATUSES.includes(offer.status) && (
                        <details className="border-t border-stone-200">
                          <summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold text-stone-600 sm:px-6 [&::-webkit-details-marker]:hidden">
                            Correct approved terms
                          </summary>
                          <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
                            <OfferCorrection
                              offerId={offer.id}
                              status={offer.status}
                              initiallyOpen
                              current={{
                                salary: offer.salary,
                                startDate: offer.startDate.toISOString(),
                                endDate: offer.endDate ? offer.endDate.toISOString() : null,
                                acceptanceDeadline: offer.acceptanceDeadline.toISOString(),
                                probationPeriod: offer.probationPeriod,
                                reportingLine: offer.reportingLine,
                                conditions: offer.conditions,
                                contractDuration: offer.contractDuration,
                              }}
                            />
                          </div>
                        </details>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
