import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatusBadgeClass, formatDateTime } from '@/lib/utils'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import InterviewResponse from '@/components/shared/InterviewResponse'

export const dynamic = 'force-dynamic'

export default async function CandidateInterviewsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const interviews = await prisma.interview.findMany({
    where: { application: { candidate: { userId: user.userId } } },
    include: { application: { include: { vacancy: { select: { title: true } } } } },
    orderBy: { scheduledStart: 'desc' },
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
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Interviews</h1>
            </div>

            {interviews.length === 0 ? (
              <p className="text-sm text-slate-500">You have no interview invitations yet.</p>
            ) : (
              interviews.map((iv) => (
                <div key={iv.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{iv.title}</h3>
                      <p className="text-xs text-slate-500">
                        {iv.application.vacancy.title} • {iv.format}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(iv.status)}`}
                    >
                      {iv.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <span className="block text-slate-400 font-semibold">Date &amp; Time</span>
                      <span className="font-bold text-slate-900">{formatDateTime(iv.scheduledStart)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold">Venue / Meeting Link</span>
                      <span className="font-mono text-brand-600 font-bold break-all">
                        {iv.meetingLink || iv.venue || '—'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`/api/calendar/interviews/${iv.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
                  </a>
                  {!['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(iv.status) && (
                    <InterviewResponse id={iv.id} current={iv.candidateResponse} />
                  )}
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
