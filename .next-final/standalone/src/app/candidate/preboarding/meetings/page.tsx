import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Calendar } from 'lucide-react'
import { SimpleAction } from '@/components/shared/PreboardingActions'

export const dynamic = 'force-dynamic'

export default async function CandidateMeetingsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const meetings = pb?.meetings ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/candidate/preboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Preboarding
          </Link>
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Meetings &amp; Orientation</h1>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-500">No meetings have been scheduled yet.</p>
            ) : (
              meetings.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{m.title}</span>
                    <span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(m.status)}`}>{m.status}</span>
                  </div>
                  <p className="text-slate-500">{formatDateTime(m.scheduledStart)} • {m.meetingLink || m.venue || 'TBC'}</p>
                  {!m.candidateResponse && <div className="flex flex-wrap gap-2"><SimpleAction resourceId={m.id} action="MEETING_RESPOND" label="Confirm attendance" data={{ response: 'CONFIRMED' }} /><SimpleAction resourceId={m.id} action="MEETING_RESPOND" label="Cannot attend" data={{ response: 'DECLINED' }} /><SimpleAction resourceId={m.id} action="MEETING_RESPOND" label="Request another time" data={{ response: 'RESCHEDULE_REQUESTED' }} /></div>}
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
