import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { getStatusBadgeClass, formatDate } from '@/lib/utils'
import { FileText, CheckCircle2, Clock, Award, Briefcase } from 'lucide-react'
import NotificationInbox from '@/components/shared/NotificationInbox'
import { profileCompletion } from '@/lib/profile-completion'
import { candidateFacingStatus, candidateStatusLabel } from '@/lib/candidate-status'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

export default async function CandidateDashboardPage() {
  const user = await getVerifiedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
    include: {
      education: true,
      employment: true,
      licences: true,
      certifications: true,
      skills: true,
      languages: true,
      documents: true,
    },
  })

  const applications = profile ? await prisma.application.findMany({
    where: { candidateId: profile.id },
    include: {
      vacancy: {
        include: {
          department: true,
          dutyStation: true,
        },
      },
      preboardings: {
        include: {
          readinessConfirmation: true,
        },
      },
      candidateAssessments: { where: { status: { in: ['INVITED', 'NOT_STARTED', 'IN_PROGRESS'] } }, include: { assessment: { select: { title: true, closesAt: true } } } },
      interviews: { where: { status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] } }, select: { id: true, title: true, scheduledStart: true } },
      offers: { where: { status: { in: ['SENT', 'VIEWED'] } }, select: { id: true, acceptanceDeadline: true } },
      messageThreads: { include: { messages: { where: { readAt: null, senderUserId: { not: user.userId } }, select: { id: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  }) : []
  const completion = profileCompletion(profile)
  const actions = applications.flatMap((application) => [
    ...application.candidateAssessments.map((assessment) => ({ key: `assessment-${assessment.id}`, label: assessment.assessment.title, detail: assessment.assessment.closesAt ? `Due ${formatDate(assessment.assessment.closesAt)}` : 'Assessment ready', href: `/candidate/assessments/${assessment.id}` })),
    ...application.interviews.map((interview) => ({ key: `interview-${interview.id}`, label: interview.title, detail: formatDate(interview.scheduledStart), href: '/candidate/interviews' })),
    ...application.offers.map((offer) => ({ key: `offer-${offer.id}`, label: 'Offer awaiting your response', detail: `Respond by ${formatDate(offer.acceptanceDeadline)}`, href: `/candidate/offers/${offer.id}` })),
  ])
  const unreadMessages = applications.reduce((sum, application) => sum + application.messageThreads.reduce((threadSum, thread) => threadSum + thread.messages.length, 0), 0)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-8">
          <PageIntro
            eyebrow="Candidate account"
            title={`Hello, ${profile?.preferredName || profile?.legalFirstName || user.email}`}
            description="Check your applications, respond to requests and keep your profile up to date."
            actions={<><Link href="/candidate/tasks" className="btn-primary">View actions</Link><Link href="/candidate/accommodations" className="btn-secondary">Request an adjustment</Link></>}
          />

          <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
            <NotificationInbox />
            <div className="section-panel p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Profile</span>
                <span className="font-extrabold text-brand-800">{completion.percentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-700 transition-all duration-500"
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
              <Link
                href="/candidate/profile"
                className="block pt-1 text-center text-xs font-semibold text-brand-800 hover:underline"
              >
                {completion.missing.length ? `Add ${completion.missing[0]}` : 'Review profile and documents'} →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 border-y border-stone-200 bg-white sm:grid-cols-3">
            <div className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-b-0 sm:border-r">
              <div className="flex h-10 w-10 items-center justify-center bg-stone-100 text-stone-700">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-slate-900">{applications.filter((application) => application.submittedAt).length}</span>
                <span className="text-xs text-slate-500 font-medium">Submitted</span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-b-0 sm:border-r">
              <div className="flex h-10 w-10 items-center justify-center bg-amber-50 text-amber-700">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-slate-900">
                  {applications.filter((application) => !['DRAFT', 'NOT_SELECTED', 'INELIGIBLE', 'WITHDRAWN', 'CANCELLED', 'OFFER_DECLINED', 'OFFER_EXPIRED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)).length}
                </span>
                <span className="text-xs text-slate-500 font-medium">In progress</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center bg-emerald-50 text-emerald-700">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-slate-900">
                  {applications.filter((a) => a.preboardingStatus === 'READY_TO_RESUME' || a.internalStatus === 'TRANSFERRED_TO_ERP').length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Ready to start</span>
              </div>
            </div>
          </div>
          {(actions.length > 0 || unreadMessages > 0) && <section className="section-panel p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl text-slate-900">What needs your attention</h2><p className="text-sm text-slate-500">Upcoming deadlines and new messages.</p></div>{unreadMessages > 0 && <Link href="/candidate/messages" className="btn-secondary">{unreadMessages} unread message{unreadMessages === 1 ? '' : 's'}</Link>}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{actions.map((action) => <Link key={action.key} href={action.href} className="border border-stone-200 bg-white p-4 hover:border-brand-700"><p className="font-semibold text-slate-900">{action.label}</p><p className="mt-1 text-xs text-slate-500">{action.detail}</p></Link>)}</div></section>}

          {/* Applications & Preboarding Section */}
          <div className="section-panel p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-2xl text-slate-900">Applications</h2>
                <p className="text-sm text-slate-500">Drafts are kept separate from applications you have submitted.</p>
              </div>
              <Link
                href="/careers"
                className="btn-secondary min-h-0 px-4 py-2 text-xs"
              >
                View vacancies
              </Link>
            </div>

            {applications.length === 0 ? (
              <EmptyState icon={FileText} title="You have not started an application" description="Open a vacancy to read the requirements and begin an application." action={{ href: '/careers', label: 'View open vacancies' }} />
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const status = candidateFacingStatus(app.internalStatus, app.candidateVisibleStatus)
                  const isDraft = status === 'APPLICATION_DRAFT'
                  return (
                  <div
                    key={app.id}
                    data-testid="candidate-application-card"
                    className="border border-stone-200 bg-white p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-stone-600">
                            {app.vacancy.referenceNumber}
                          </span>
                          <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${getStatusBadgeClass(status)}`}>
                            {candidateStatusLabel(status)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{app.vacancy.title}</h3>
                        <p className="text-xs text-slate-500">
                          {app.vacancy.department.name} • {app.vacancy.dutyStation.name} ({app.vacancy.dutyStation.state})
                        </p>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 text-right">
                        <div>{isDraft ? 'Draft saved' : 'Received'}: <strong>{formatDate(isDraft ? app.updatedAt : app.submittedAt || app.updatedAt)}</strong></div>
                        {app.preboardings.length > 0 && (
                          <div className="font-bold text-emerald-700">
                            Preboarding: {app.preboardings[0].overallCompletionPercentage}% Complete
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage Timeline */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4 text-xs">
                      <div className="flex items-center gap-2">
                        {isDraft ? <Clock className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        <span className="font-semibold text-slate-800">{isDraft ? 'Draft saved' : 'Application received'}</span>
                      </div>
                      <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${['LONGLISTED', 'SHORTLISTED', 'ASSESSMENT_INVITED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'PREBOARDING_IN_PROGRESS', 'READY_TO_RESUME'].includes(status) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="font-semibold text-slate-800">Review and interview</span>
                      </div>
                      <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${['OFFER_SENT', 'OFFER_ACCEPTED', 'PREBOARDING_IN_PROGRESS', 'READY_TO_RESUME'].includes(status) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="font-semibold text-slate-800">Offer</span>
                      </div>
                      <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${['PREBOARDING_IN_PROGRESS', 'READY_TO_RESUME'].includes(status) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="font-semibold text-slate-800">Preboarding</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href={isDraft ? `/candidate/applications/apply?vacancyId=${app.vacancy.id}` : `/candidate/applications/${app.id}`}
                        className="text-xs font-bold text-brand-800 hover:underline"
                      >
                        {isDraft ? 'Continue application' : 'View application'}
                      </Link>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
