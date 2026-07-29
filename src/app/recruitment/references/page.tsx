import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, Search, UserRoundPlus } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ReferenceManager, { ReferenceActions, VerifyReferenceResponse } from '@/components/admin/ReferenceManager'
import { hasPermission } from '@/lib/rbac'
import { canMakeHrManagerDecision, canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

export const dynamic = 'force-dynamic'

const ANSWER_LABELS: Record<string, string> = {
  confirmDates: 'Employment dates and job title',
  responsibilities: 'Main responsibilities',
  workQuality: 'Performance and reliability',
  integrity: 'Integrity',
  teamwork: 'Teamwork',
  management: 'Management',
  reasonForLeaving: 'Reason for leaving',
  strengths: 'Key strengths',
  developmentAreas: 'Development areas',
  rehire: 'Would employ again',
  safeguardingConcerns: 'Safeguarding, misconduct or disciplinary concerns',
}

function readAnswers(value: string) {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function referenceState(referee: {
  contactStatus: string
  requests: Array<{
    status: string
    expiresAt: Date
    response: { verifiedAt: Date | null; outcome: string } | null
  }>
}) {
  if (referee.contactStatus === 'WAIVED') return 'WAIVED'
  if (referee.contactStatus === 'UNABLE_TO_CONTACT') return 'UNABLE_TO_CONTACT'
  const latest = referee.requests[0]
  if (!latest) return 'NOT_SENT'
  if (latest.response?.verifiedAt) return latest.response.outcome
  if (latest.response) return 'REVIEW_REQUIRED'
  if (latest.expiresAt < new Date()) return 'EXPIRED'
  return latest.status
}

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    NOT_SENT: 'Not sent',
    SENT: 'Awaiting response',
    PENDING: 'Awaiting response',
    REVIEW_REQUIRED: 'Response ready to review',
    EXPIRED: 'Link expired',
    UNABLE_TO_CONTACT: 'Unable to contact',
    WAIVED: 'Waived',
    SATISFACTORY: 'Satisfactory',
    SATISFACTORY_WITH_CONCERNS: 'Concerns recorded',
    UNSATISFACTORY: 'Unsatisfactory',
  }
  return labels[state] || state.replaceAll('_', ' ').toLowerCase()
}

function stateTone(state: string) {
  if (state === 'REVIEW_REQUIRED') return 'border-amber-300 bg-amber-50 text-amber-900'
  if (['SATISFACTORY', 'WAIVED'].includes(state)) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (['UNSATISFACTORY', 'UNABLE_TO_CONTACT', 'EXPIRED'].includes(state))
    return 'border-rose-200 bg-rose-50 text-rose-800'
  if (state === 'SATISFACTORY_WITH_CONCERNS') return 'border-orange-200 bg-orange-50 text-orange-900'
  return 'border-stone-300 bg-stone-50 text-stone-700'
}

export default async function RecruitmentReferencesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'reference.manage')))
    redirect('/recruitment/dashboard')

  const view = query.view === 'history' ? 'history' : 'action'
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''

  const referees = await prisma.referee.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { organization: { contains: search, mode: 'insensitive' } },
            { application: { candidate: { legalFirstName: { contains: search, mode: 'insensitive' } } } },
            { application: { candidate: { lastName: { contains: search, mode: 'insensitive' } } } },
            { application: { vacancy: { title: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      organization: true,
      position: true,
      relationship: true,
      email: true,
      preferredContactMethod: true,
      contactStatus: true,
      waiverReason: true,
      periodKnown: true,
      application: {
        select: {
          id: true,
          referenceNumber: true,
          candidate: { select: { legalFirstName: true, lastName: true } },
          vacancy: { select: { title: true, referenceNumber: true } },
        },
      },
      requests: {
        orderBy: [{ sentAt: 'desc' }, { expiresAt: 'desc' }],
        take: 1,
        select: {
          id: true,
          sentAt: true,
          reminderSentAt: true,
          responseReceivedAt: true,
          expiresAt: true,
          status: true,
          response: {
            select: {
              id: true,
              answersJson: true,
              outcome: true,
              confidentialComment: true,
              verifiedAt: true,
            },
          },
        },
      },
    },
    take: 250,
  })

  const applications = await prisma.application.findMany({
    where: { internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
    orderBy: { updatedAt: 'desc' },
    take: 250,
    select: {
      id: true,
      referenceNumber: true,
      candidate: { select: { legalFirstName: true, lastName: true } },
      vacancy: { select: { title: true, referenceNumber: true } },
    },
  })

  const records = referees
    .map((referee) => ({ referee, state: referenceState(referee) }))
    .filter(({ state }) =>
      view === 'history'
        ? ['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY', 'WAIVED'].includes(state)
        : !['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY', 'WAIVED'].includes(state)
    )
    .sort((a, b) => {
      const priority = ['REVIEW_REQUIRED', 'EXPIRED', 'UNABLE_TO_CONTACT', 'NOT_SENT', 'SENT', 'PENDING']
      return priority.indexOf(a.state) - priority.indexOf(b.state)
    })

  const reviewCount = referees.filter((referee) => referenceState(referee) === 'REVIEW_REQUIRED').length

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            title="References"
            description="Collect employment references and record FRAD’s review."
            actions={
              reviewCount ? (
                <span className="inline-flex items-center gap-2 border-l-2 border-amber-600 pl-4 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  {reviewCount} {reviewCount === 1 ? 'response needs' : 'responses need'} review
                </span>
              ) : undefined
            }
          />

          <div className="flex flex-col gap-4 border-b border-stone-300 sm:flex-row sm:items-end sm:justify-between">
            <nav aria-label="Reference sections" className="flex gap-7">
              <Link href="/recruitment/references?view=action" aria-current={view === 'action' ? 'page' : undefined} className={`border-b-2 pb-3 text-sm font-semibold ${view === 'action' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
                Needs action
              </Link>
              <Link href="/recruitment/references?view=history" aria-current={view === 'history' ? 'page' : undefined} className={`border-b-2 pb-3 text-sm font-semibold ${view === 'history' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
                Completed
              </Link>
            </nav>
            <form className="mb-2 flex w-full max-w-sm items-center gap-2" action="/recruitment/references">
              <input type="hidden" name="view" value={view} />
              <label className="relative flex-1">
                <span className="sr-only">Search references</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input name="q" defaultValue={search} placeholder="Candidate, vacancy or referee" className="field-control pl-9" />
              </label>
              <button className="btn-secondary">Search</button>
            </form>
          </div>

          {view === 'action' && (
            <details className="section-panel">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy-950">
                  <UserRoundPlus className="h-4 w-4 text-brand-700" />
                  Start or record a check
                </span>
                <span className="text-sm text-stone-500">Open form</span>
              </summary>
              <div className="border-t border-stone-200">
                <ReferenceManager
                  canWaive={canMakeHrManagerDecision(user.roles)}
                  applications={applications.map((application) => ({
                    id: application.id,
                    name: `${application.candidate.legalFirstName} ${application.candidate.lastName} — ${application.vacancy.referenceNumber} · ${application.vacancy.title}`,
                  }))}
                />
              </div>
            </details>
          )}

          <section aria-labelledby="reference-list-heading" className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <h2 id="reference-list-heading" className="text-lg font-semibold text-navy-950">
                  {view === 'action' ? 'Checks to progress' : 'Completed checks'}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {view === 'action'
                    ? 'Responses are not complete until a recruitment officer has reviewed the evidence.'
                    : 'Reviewed outcomes and approved waivers.'}
                </p>
              </div>
              <span className="text-sm text-stone-500">{records.length} shown</span>
            </div>

            {!records.length ? (
              <div className="section-panel px-6 py-12 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
                <p className="mt-3 text-sm font-semibold text-navy-950">
                  {search ? 'No references match this search.' : view === 'action' ? 'No reference checks need action.' : 'No completed checks yet.'}
                </p>
              </div>
            ) : (
              records.map(({ referee, state }) => {
                const latest = referee.requests[0]
                const response = latest?.response
                const answers = response ? readAnswers(response.answersJson) : {}
                return (
                  <article key={referee.id} className="section-panel overflow-hidden">
                    <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-navy-950">
                            {referee.application.candidate.legalFirstName} {referee.application.candidate.lastName}
                          </h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateTone(state)}`}>
                            {stateLabel(state)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">
                          {referee.application.vacancy.referenceNumber} · {referee.application.vacancy.title}
                        </p>
                        <p className="mt-3 text-sm text-stone-700">
                          <span className="font-semibold text-navy-950">{referee.name}</span>, {referee.position} at {referee.organization}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {referee.relationship}
                          {referee.periodKnown ? ` · ${referee.periodKnown}` : ''}
                          {latest?.sentAt ? ` · Sent ${latest.sentAt.toLocaleDateString('en-GB')}` : ''}
                          {latest?.responseReceivedAt ? ` · Received ${latest.responseReceivedAt.toLocaleDateString('en-GB')}` : ''}
                        </p>
                      </div>
                      <div className="flex items-start">
                        {referee.contactStatus === 'READY' && referee.preferredContactMethod === 'EMAIL' && !response?.verifiedAt && !response && (
                          <ReferenceActions id={referee.id} hasActive={!!latest && ['PENDING', 'SENT'].includes(latest.status) && latest.expiresAt >= new Date()} />
                        )}
                        {response?.verifiedAt && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                            <FileCheck2 className="h-4 w-4" /> Reviewed {response.verifiedAt.toLocaleDateString('en-GB')}
                          </span>
                        )}
                        {state === 'REVIEW_REQUIRED' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                            <Clock3 className="h-4 w-4" /> Awaiting staff review
                          </span>
                        )}
                      </div>
                    </div>

                    {referee.waiverReason && (
                      <p className="border-t border-stone-200 bg-stone-50 px-5 py-3 text-sm text-stone-700 sm:px-6">
                        <span className="font-semibold">Waiver reason:</span> {referee.waiverReason}
                      </p>
                    )}

                    {response && Object.keys(answers).length > 0 && (
                      <details className="border-t border-stone-200" open={state === 'REVIEW_REQUIRED'}>
                        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-brand-800 sm:px-6">
                          Review referee’s answers
                        </summary>
                        <div className="grid gap-x-8 gap-y-5 border-t border-stone-200 bg-stone-50 px-5 py-5 sm:px-6 md:grid-cols-2">
                          {Object.entries(ANSWER_LABELS).map(([key, label]) => {
                            const value = answers[key]
                            if (value === undefined || value === '') return null
                            return (
                              <div key={key}>
                                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-stone-500">{label}</dt>
                                <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-800">{String(value)}</dd>
                              </div>
                            )
                          })}
                          {response.confidentialComment && (
                            <div className="md:col-span-2">
                              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-stone-500">Additional comments</dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-800">{response.confidentialComment}</dd>
                            </div>
                          )}
                          {!response.verifiedAt && (
                            <div className="md:col-span-2">
                              <VerifyReferenceResponse responseId={response.id} />
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </article>
                )
              })
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
