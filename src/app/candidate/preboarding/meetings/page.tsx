import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, Calendar, ExternalLink, MapPin } from 'lucide-react'
import { MeetingResponseAction } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

export const dynamic = 'force-dynamic'

function formatMeetingDate(start: string | Date, end: string | Date, timeZone: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', options)
    return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
  } catch {
    const formatter = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'Africa/Lagos' })
    return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
  }
}

function safeMeetingUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export default async function CandidateMeetingsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const meetings = pb?.meetings ?? []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Before you start
          </Link>
          <PageIntro
            eyebrow="Before you start"
            title="Meetings"
            description="Confirm orientation and any other appointment arranged before your first day."
          />
          {meetings.length === 0 ? (
            <EmptyState icon={Calendar} title="No meetings scheduled" description="Meeting details will appear here." />
          ) : (
            <section className="section-panel divide-y divide-stone-200">
              {meetings.map((m) => {
                const meetingUrl = safeMeetingUrl(m.meetingLink)
                const canRespond =
                  !m.candidateResponse && !['ATTENDED', 'MISSED', 'CANCELLED', 'WAIVED'].includes(m.status)
                return (
                  <article id={`meeting-${m.id}`} key={m.id} className="scroll-mt-24 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-navy-900">{m.title}</h2>
                        {m.description && <p className="mt-2 text-sm leading-6 text-stone-600">{m.description}</p>}
                        <p className="mt-2 text-sm font-semibold text-stone-700">
                          {formatMeetingDate(m.scheduledStart, m.scheduledEnd, m.timezone)}
                        </p>
                        {m.venue && (
                          <p className="mt-2 inline-flex items-start gap-2 text-sm text-stone-700">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /> {m.venue}
                          </p>
                        )}
                        {meetingUrl && (
                          <a href={meetingUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-3">
                            <ExternalLink className="h-4 w-4" /> Join online meeting
                          </a>
                        )}
                        {!m.venue && !meetingUrl && (
                          <p className="mt-2 text-sm text-stone-500">FRAD will confirm how to join.</p>
                        )}
                      </div>
                      <span className={`status-chip ${getStatusBadgeClass(m.status)}`}>
                        {m.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>
                    {m.candidateResponse && (
                      <p className="mt-4 text-sm font-semibold text-stone-700">
                        Your response: {m.candidateResponse.replaceAll('_', ' ').toLowerCase()}
                      </p>
                    )}
                    {canRespond && <MeetingResponseAction resourceId={m.id} />}
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
