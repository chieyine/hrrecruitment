import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateTime, getStatusBadgeClass } from '@/lib/utils'
import { CalendarDays, CalendarPlus, MapPin } from 'lucide-react'
import InterviewResponse from '@/components/shared/InterviewResponse'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CandidateInterviewsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const interviews = await prisma.interview.findMany({
    where: { application: { candidate: { userId: user.userId } } },
    include: { application: { include: { vacancy: { select: { title: true } } } } },
    orderBy: { scheduledStart: 'desc' },
  })
  const now = new Date()
  const isUpcoming = (interview: (typeof interviews)[number]) =>
    interview.scheduledEnd >= now && interview.status !== 'CANCELLED'
  const orderedInterviews = [...interviews].sort((left, right) => {
    const leftUpcoming = isUpcoming(left)
    const rightUpcoming = isUpcoming(right)
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1
    return leftUpcoming
      ? left.scheduledStart.getTime() - right.scheduledStart.getTime()
      : right.scheduledStart.getTime() - left.scheduledStart.getTime()
  })

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow="Candidate account"
            title="Interviews"
            description="Interview dates, joining details and invitations that need your reply. The time zone is shown beside each time."
            actions={
              <Link href="/candidate/accommodations" className="btn-secondary">
                Request an adjustment
              </Link>
            }
          />

          {interviews.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No interviews"
              description="An invitation will appear here if the recruitment team asks to meet with you."
            />
          ) : (
            <section aria-label="Your interviews" className="section-panel">
              <div className="divide-y divide-stone-100">
                {orderedInterviews.map((interview, index) => {
                  const upcoming = isUpcoming(interview)
                  const previous = orderedInterviews[index - 1]
                  const startsSection = index === 0 || isUpcoming(previous) !== upcoming
                  const canAddToCalendar = upcoming
                  const meetingUrl =
                    interview.meetingLink && /^https?:\/\//i.test(interview.meetingLink) ? interview.meetingLink : null
                  return (
                    <div key={interview.id}>
                      {startsSection && (
                        <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 sm:px-6">
                          {upcoming ? 'Upcoming' : 'Past and cancelled'}
                        </div>
                      )}
                      <article id={`interview-${interview.id}`} className="scroll-mt-28 px-5 py-6 sm:px-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <span className={`status-chip ${getStatusBadgeClass(interview.status)}`}>
                              {interview.status
                                .replaceAll('_', ' ')
                                .toLowerCase()
                                .replace(/^./, (letter) => letter.toUpperCase())}
                            </span>
                            <h2 className="mt-3 text-lg font-semibold text-navy-900">{interview.title}</h2>
                            <p className="mt-1 text-sm text-stone-600">{interview.application.vacancy.title}</p>
                          </div>
                          {canAddToCalendar && (
                            <a
                              href={`/api/calendar/interviews/${interview.id}`}
                              className="btn-secondary min-h-10 px-4 py-2 text-xs"
                            >
                              <CalendarPlus className="h-4 w-4" /> Add to calendar
                            </a>
                          )}
                        </div>

                        <div className="mt-5 grid gap-3 rounded-xl bg-stone-50 px-4 py-3 sm:grid-cols-2">
                          <p className="flex items-start gap-2 text-sm text-stone-700">
                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                            <span>
                              <span className="block text-xs font-semibold text-stone-500">Date and time</span>
                              <span className="mt-0.5 block font-semibold text-navy-900">
                                {formatDateTime(interview.scheduledStart)}
                              </span>
                            </span>
                          </p>
                          <p className="flex items-start gap-2 text-sm text-stone-700">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-stone-500">
                                {interview.meetingLink ? 'Meeting link' : 'Location'}
                              </span>
                              {meetingUrl ? (
                                <a
                                  href={meetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-0.5 block break-all font-semibold text-brand-800 underline underline-offset-2"
                                >
                                  Join online interview
                                </a>
                              ) : (
                                <span className="mt-0.5 block break-words font-semibold text-navy-900">
                                  {interview.venue || 'The recruitment team will confirm this.'}
                                </span>
                              )}
                            </span>
                          </p>
                        </div>

                        {!['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(interview.status) && (
                          <div className="mt-5 border-t border-stone-200 pt-5">
                            <InterviewResponse id={interview.id} current={interview.candidateResponse} />
                          </div>
                        )}
                      </article>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
