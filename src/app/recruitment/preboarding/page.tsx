import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const VIEWS = [
  ['attention', 'Needs attention'],
  ['active', 'All active'],
  ['ready', 'Ready and completed'],
] as const
const DONE_ITEM_STATUSES = ['APPROVED', 'WAIVED', 'SIGNED', 'COMPLETED', 'VERIFIED']

export default async function RecruitmentPreboardingListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'preboarding.manage')))
    redirect('/recruitment/dashboard')

  const preboardings = await prisma.candidatePreboarding.findMany({
    select: {
      id: true,
      status: true,
      readinessStatus: true,
      overallCompletionPercentage: true,
      confirmedStartDate: true,
      startedAt: true,
      application: {
        select: {
          referenceNumber: true,
          candidate: { select: { legalFirstName: true, lastName: true } },
          vacancy: { select: { title: true, referenceNumber: true } },
        },
      },
      readinessChecks: { select: { required: true, status: true } },
      forms: { select: { required: true, status: true, dueAt: true } },
      documents: { select: { required: true, status: true, dueAt: true } },
      courses: { select: { required: true, status: true, dueAt: true } },
      tasks: { select: { required: true, status: true, dueAt: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 250,
  })

  const now = new Date()
  const riskDate = new Date(now.getTime() + 14 * 86_400_000)
  const records = preboardings.map((preboarding) => {
    const requirements = [...preboarding.forms, ...preboarding.documents, ...preboarding.courses, ...preboarding.tasks]
    const overdue = requirements.filter(
      (item) => item.required && item.dueAt && item.dueAt < now && !DONE_ITEM_STATUSES.includes(item.status)
    ).length
    const blockers = preboarding.readinessChecks.filter(
      (check) => check.required && !['PASSED', 'WAIVED'].includes(check.status)
    ).length
    const ready = ['READY_TO_RESUME', 'COMPLETED'].includes(preboarding.status)
    const startAtRisk =
      Boolean(preboarding.confirmedStartDate && preboarding.confirmedStartDate <= riskDate) && !ready && blockers > 0
    const needsHrReview =
      preboarding.status === 'AWAITING_HR_REVIEW' ||
      ['PENDING_HR_REVIEW', 'CONDITIONALLY_READY'].includes(preboarding.readinessStatus)
    return { ...preboarding, overdue, blockers, ready, startAtRisk, needsHrReview }
  })
  const requestedView = typeof query.view === 'string' ? query.view : 'attention'
  const view = VIEWS.some(([value]) => value === requestedView) ? requestedView : 'attention'
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const byView = records.filter((record) =>
    view === 'ready'
      ? record.ready
      : view === 'active'
        ? !record.ready
        : !record.ready && (record.needsHrReview || record.overdue > 0 || record.startAtRisk)
  )
  const visible = byView
    .filter((record) => {
      if (!search) return true
      const candidate = record.application.candidate
      return [
        candidate.legalFirstName,
        candidate.lastName,
        record.application.referenceNumber,
        record.application.vacancy.referenceNumber,
        record.application.vacancy.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
    .sort((a, b) => {
      const priority = (record: (typeof records)[number]) =>
        record.startAtRisk ? 0 : record.overdue > 0 ? 1 : record.needsHrReview ? 2 : 3
      return (
        priority(a) - priority(b) ||
        +(a.confirmedStartDate || new Date(8640000000000000)) - +(b.confirmedStartDate || new Date(8640000000000000)) ||
        +a.startedAt - +b.startedAt
      )
    })
  const counts = {
    attention: records.filter(
      (record) => !record.ready && (record.needsHrReview || record.overdue > 0 || record.startAtRisk)
    ).length,
    active: records.filter((record) => !record.ready).length,
    ready: records.filter((record) => record.ready).length,
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            title="Preboarding"
            description="Review submitted requirements and clear new starters when every required check is complete."
          />

          <div className="flex flex-col justify-between gap-4 border-b border-stone-300 sm:flex-row sm:items-end">
            <nav aria-label="Preboarding views" className="flex gap-6">
              {VIEWS.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/recruitment/preboarding?view=${value}`}
                  aria-current={view === value ? 'page' : undefined}
                  className={`border-b-2 pb-3 text-sm font-semibold ${
                    view === value
                      ? 'border-brand-700 text-navy-950'
                      : 'border-transparent text-stone-500 hover:text-navy-900'
                  }`}
                >
                  {label} <span className="ml-1 text-xs font-normal">{counts[value]}</span>
                </Link>
              ))}
            </nav>
            <form className="pb-3" role="search">
              <input type="hidden" name="view" value={view} />
              <label className="sr-only" htmlFor="preboarding-search">
                Search preboarding
              </label>
              <input
                id="preboarding-search"
                name="q"
                defaultValue={typeof query.q === 'string' ? query.q : ''}
                placeholder="Candidate, role or reference"
                className="field-control w-full sm:w-72"
              />
            </form>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={search ? 'No matching preboarding records' : 'Nothing in this view'}
              description={
                search
                  ? 'Try a candidate name, vacancy or application reference.'
                  : view === 'attention'
                    ? 'Cases will appear here when HR review is due, a requirement is overdue or a start date is at risk.'
                    : view === 'active'
                      ? 'Candidates appear after they accept an offer.'
                      : 'Cleared and completed starters will be kept here.'
              }
            />
          ) : (
            <div className="space-y-3">
              {visible.map((preboarding) => {
                const candidate = preboarding.application.candidate
                return (
                  <article
                    key={preboarding.id}
                    className="section-panel grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(preboarding.readinessStatus)}`}
                        >
                          {preboarding.readinessStatus.replaceAll('_', ' ')}
                        </span>
                        {preboarding.startAtRisk && (
                          <span className="text-xs font-semibold text-rose-700">Start date at risk</span>
                        )}
                        {!preboarding.startAtRisk && preboarding.overdue > 0 && (
                          <span className="text-xs font-semibold text-rose-700">{preboarding.overdue} overdue</span>
                        )}
                        {preboarding.needsHrReview && (
                          <span className="text-xs font-semibold text-amber-700">HR review due</span>
                        )}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-navy-950">
                        {candidate.legalFirstName} {candidate.lastName}
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">
                        {preboarding.application.vacancy.referenceNumber} · {preboarding.application.vacancy.title}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-stone-500">Completion</dt>
                          <dd className="mt-1 font-semibold text-navy-950">
                            {preboarding.overallCompletionPercentage}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-stone-500">Required checks open</dt>
                          <dd className="mt-1 font-semibold text-navy-950">{preboarding.blockers}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-stone-500">Planned start</dt>
                          <dd className="mt-1 font-semibold text-navy-950">
                            {preboarding.confirmedStartDate ? formatDate(preboarding.confirmedStartDate) : 'Not set'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <Link href={`/recruitment/preboarding/${preboarding.id}`} className="btn-primary">
                      Open record <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
