import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AccommodationRequestForm from '@/components/shared/AccommodationRequestForm'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LockKeyhole } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { homeRouteForRoles } from '@/lib/home-route'

export default async function CandidateAccommodationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))
  const applications = await prisma.application.findMany({
    where: {
      candidate: { userId: user.userId },
      internalStatus: {
        notIn: [
          'DRAFT',
          'WITHDRAWN',
          'CANCELLED',
          'NOT_SELECTED',
          'INELIGIBLE',
          'OFFER_DECLINED',
          'OFFER_EXPIRED',
          'TRANSFERRED_TO_ERP',
        ],
      },
    },
    select: { id: true, vacancy: { select: { title: true, referenceNumber: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  const requests = await prisma.accommodationRequest.findMany({
    where: { applicationId: { in: applications.map((application) => application.id) } },
    include: {
      application: { select: { vacancy: { select: { title: true, referenceNumber: true } } } },
    },
    orderBy: { requestedAt: 'desc' },
  })
  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow="Candidate support"
            title="Request an adjustment"
            description="Tell us what would help you take part in an assessment, interview or other part of recruitment."
          />

          <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <p className="text-sm leading-6 text-brand-950">
              Only the recruitment HR team can read your request. Interviewers, assessors and selection panels cannot
              see it.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="section-panel px-5 py-6 sm:px-6">
              {applications.length ? (
                <AccommodationRequestForm applications={applications} />
              ) : (
                <EmptyState
                  title="No active application"
                  description="You can request an adjustment after starting an application for an open role."
                  action={{ href: '/careers', label: 'View open roles' }}
                />
              )}
            </section>

            <section aria-labelledby="request-history-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="request-history-heading" className="text-lg font-semibold text-navy-900">
                    Your requests
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Your request and HR’s reply.</p>
                </div>
              </div>
              {requests.length ? (
                <div className="divide-y divide-stone-100">
                  {requests.map((request) => (
                    <article key={request.id} className="px-5 py-5 text-sm sm:px-6">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-navy-900">
                          {request.requestType
                            .replaceAll('_', ' ')
                            .toLowerCase()
                            .replace(/^./, (letter) => letter.toUpperCase())}
                        </span>
                        <span className="status-chip border-brand-200 bg-brand-50 text-brand-800">
                          {request.status
                            .replaceAll('_', ' ')
                            .toLowerCase()
                            .replace(/^./, (letter) => letter.toUpperCase())}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {request.application.vacancy.referenceNumber} · {request.application.vacancy.title} · Sent{' '}
                        {formatDateTime(request.requestedAt)}
                      </p>
                      <div className="mt-3 rounded-lg bg-stone-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Your request</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{request.details}</p>
                      </div>
                      {request.decision && (
                        <div className="mt-3 border-l-2 border-brand-600 pl-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-700">HR reply</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                            {request.decision}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState
                    title="No requests"
                    description="Requests you send will appear here with their current status."
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
