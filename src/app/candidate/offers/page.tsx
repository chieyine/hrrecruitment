import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass, formatDate } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CandidateOffersPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const offers = await prisma.offer.findMany({
    where: {
      application: { candidate: { userId: user.userId } },
      // Candidates must never see drafts, approval-stage terms, or superseded
      // versions. Those records are internal working material.
      status: { in: ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'] },
    },
    orderBy: { startDate: 'desc' },
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
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Offers</h1>
            </div>

            {offers.length === 0 ? (
              <p className="text-sm text-slate-500">You have no job offers yet.</p>
            ) : (
              offers.map((o) => (
                <div key={o.id} className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{o.position}</h3>
                      <p className="text-xs text-slate-500">
                        {o.dutyStation} • {o.salary} • Respond by {formatDate(o.acceptanceDeadline)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(o.status)}`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/candidate/offers/${o.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                    >
                      Review offer <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
