import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CandidateMergeManager from '@/components/admin/CandidateMergeManager'
import { PageIntro } from '@/components/ui/PageElements'
import { canMakeHrManagerDecision, canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

const VIEWS = [
  ['checks', 'Record checks'],
  ['scoring', 'Scoring and overrides'],
  ['duplicates', 'Duplicate records'],
] as const

export default async function RecruitmentQualityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const isRecruitmentHr = canRunRecruitmentOperations(user.roles)
  if (!isRecruitmentHr && !(await hasPermission(user.userId, 'report.export'))) redirect('/recruitment/dashboard')
  const now = new Date()
  const [
    scorecards,
    submissions,
    overrides,
    candidates,
    missingContacts,
    unassignedApplications,
    vacanciesWithoutScorecards,
    interviewPanels,
    inconsistentAssessments,
    offerCandidates,
    overduePreboarding,
    erpMissing,
  ] = await Promise.all([
    prisma.candidateScorecard.findMany({
      where: {
        status: 'SUBMITTED',
        application: {
          internalStatus: { notIn: ['NOT_SELECTED', 'WITHDRAWN', 'CANCELLED', 'TRANSFERRED_TO_ERP'] },
        },
      },
      select: {
        applicationId: true,
        totalScore: true,
        application: {
          select: {
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { title: true } },
          },
        },
      },
      take: 5000,
    }),
    prisma.interviewPanelSubmission.findMany({
      where: { interview: { status: 'PANEL_REVIEW' } },
      include: {
        interview: { select: { id: true, title: true } },
      },
      take: 5000,
    }),
    prisma.selectionDecision.findMany({
      where: { overrideFlag: true },
      include: { application: { include: { vacancy: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 100,
    }),
    prisma.candidateProfile.findMany({
      select: {
        id: true,
        legalFirstName: true,
        lastName: true,
        primaryPhone: true,
        user: { select: { email: true } },
        applications: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
    prisma.candidateProfile.count({ where: { primaryPhone: null, user: { phone: null } } }),
    prisma.application.count({
      where: { assignedReviewerId: null, internalStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    }),
    prisma.vacancy.count({
      where: {
        status: { in: ['OPEN', 'APPROVED'] },
        OR: [{ screeningScorecardTemplateId: null }, { interviewScorecardTemplateId: null }],
      },
    }),
    prisma.interview.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, _count: { select: { panelMembers: true } } },
      take: 5000,
    }),
    prisma.candidateAssessment.count({
      where: {
        OR: [
          { status: { in: ['PASSED', 'FAILED'] }, score: null },
          { status: 'AWAITING_APPROVAL', passed: null },
        ],
      },
    }),
    prisma.offer.findMany({
      where: { status: 'PENDING_APPROVAL' },
      select: { id: true },
      take: 5000,
    }),
    prisma.candidatePreboarding.count({
      where: {
        OR: [
          { forms: { some: { dueAt: { lt: now }, status: { notIn: ['APPROVED', 'WAIVED'] } } } },
          { documents: { some: { dueAt: { lt: now }, status: { notIn: ['APPROVED', 'WAIVED'] } } } },
          { courses: { some: { dueAt: { lt: now }, status: { notIn: ['COMPLETED', 'WAIVED'] } } } },
          { tasks: { some: { dueAt: { lt: now }, status: { notIn: ['COMPLETED', 'APPROVED', 'WAIVED'] } } } },
        ],
      },
    }),
    prisma.application.count({ where: { internalStatus: 'TRANSFERRED_TO_ERP', erpTransferRecord: null } }),
  ])
  const approvedOffers = offerCandidates.length
    ? await prisma.approval.findMany({
        where: {
          resourceType: 'OFFER',
          resourceId: { in: offerCandidates.map((item) => item.id) },
          decision: { in: ['PENDING', 'APPROVED', 'APPROVED_WITH_CONDITIONS'] },
        },
        select: { resourceId: true },
      })
    : []
  const operationalChecks = [
    ['Candidates missing contact information', missingContacts, '/recruitment/search'],
    ['Applications without an owner', unassignedApplications, '/recruitment/applications'],
    ['Active vacancies missing a scorecard', vacanciesWithoutScorecards, '/recruitment/vacancies'],
    [
      'Interviews without a full panel',
      interviewPanels.filter((item) => item._count.panelMembers < 2).length,
      '/recruitment/interviews',
    ],
    ['Inconsistent assessment outcomes', inconsistentAssessments, '/recruitment/assessments'],
    [
      'Offers missing approval records',
      offerCandidates.length - new Set(approvedOffers.map((item) => item.resourceId)).size,
      '/recruitment/offers',
    ],
    ['Preboarding cases with overdue mandatory items', overduePreboarding, '/recruitment/preboarding'],
    ['ERP transfers missing a personnel number', erpMissing, '/recruitment/preboarding'],
  ] as const

  const scorecardGroups = new Map<string, typeof scorecards>()
  for (const item of scorecards) {
    const group = scorecardGroups.get(item.applicationId) || []
    group.push(item)
    scorecardGroups.set(item.applicationId, group)
  }
  const scorecardVariances = [...scorecardGroups.values()]
    .filter((items) => items.length > 1)
    .map((items) => {
      const values = items.map((item) => item.totalScore)
      return {
        applicationId: items[0].applicationId,
        candidate: `${items[0].application.candidate.legalFirstName} ${items[0].application.candidate.lastName}`,
        vacancy: items[0].application.vacancy.title,
        reviewers: items.length,
        minimum: Math.min(...values),
        maximum: Math.max(...values),
        spread: Math.max(...values) - Math.min(...values),
      }
    })
    .sort((a, b) => b.spread - a.spread)
  const interviewGroups = new Map<string, typeof submissions>()
  for (const item of submissions) {
    const group = interviewGroups.get(item.interviewId) || []
    group.push(item)
    interviewGroups.set(item.interviewId, group)
  }
  const variances = [...interviewGroups.values()]
    .map((items) => {
      const scores = items.map((item) => item.totalScore)
      return {
        id: items[0].interview.id,
        title: items[0].interview.title,
        count: items.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        spread: Math.max(...scores) - Math.min(...scores),
      }
    })
    .filter((item) => item.count > 1)
    .sort((a, b) => b.spread - a.spread)
  const duplicateKeys = new Map<string, typeof candidates>()
  for (const candidate of candidates) {
    const phone = candidate.primaryPhone?.replace(/\D/g, '')
    const key =
      phone && phone.length >= 8
        ? `phone:${phone.slice(-10)}`
        : `name:${candidate.legalFirstName.trim().toLowerCase()}|${candidate.lastName.trim().toLowerCase()}`
    const group = duplicateKeys.get(key) || []
    group.push(candidate)
    duplicateKeys.set(key, group)
  }
  const potentialDuplicates = [...duplicateKeys.entries()].filter(([, group]) => group.length > 1)
  const requestedView = typeof query.view === 'string' ? query.view : 'checks'
  const view = VIEWS.some(([value]) => value === requestedView) ? requestedView : 'checks'
  const openRecordChecks = operationalChecks.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-8">
          <PageIntro
            title="Decision review"
            description="Resolve incomplete records and inspect scoring differences or ranking exceptions before a decision moves forward."
          />

          <nav aria-label="Decision review views" className="flex gap-7 border-b border-stone-300">
            {VIEWS.map(([value, label]) => {
              const count =
                value === 'checks'
                  ? openRecordChecks
                  : value === 'scoring'
                    ? scorecardVariances.length + variances.length + overrides.length
                    : potentialDuplicates.length
              return (
                <Link
                  key={value}
                  href={`/recruitment/quality?view=${value}`}
                  aria-current={view === value ? 'page' : undefined}
                  className={`border-b-2 pb-3 text-sm font-semibold ${
                    view === value
                      ? 'border-brand-700 text-navy-950'
                      : 'border-transparent text-stone-500 hover:text-navy-900'
                  }`}
                >
                  {label} <span className="ml-1 text-xs font-normal">{count}</span>
                </Link>
              )
            })}
          </nav>

          {view === 'checks' && (
            <section aria-labelledby="record-checks-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="record-checks-heading" className="text-lg font-semibold text-navy-950">
                    Records to check
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Open a row to correct the source record.</p>
                </div>
              </div>
              <div className="divide-y divide-stone-200">
                {operationalChecks.map(([label, count, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="group grid gap-3 px-5 py-4 transition hover:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      {count ? (
                        <CircleAlert aria-hidden className="h-4 w-4 shrink-0 text-amber-700" />
                      ) : (
                        <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" />
                      )}
                      <span className="text-sm font-medium text-stone-800">{label}</span>
                    </div>
                    <span className="flex items-center gap-3 pl-7 sm:pl-0">
                      <span
                        className={`min-w-16 text-right text-sm font-semibold ${count ? 'text-amber-800' : 'text-emerald-700'}`}
                      >
                        {count ? `${count} open` : 'Clear'}
                      </span>
                      <ArrowUpRight
                        aria-hidden
                        className="h-4 w-4 text-stone-400 transition group-hover:text-brand-700"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {view === 'duplicates' && (
            <section aria-labelledby="duplicate-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="duplicate-heading" className="text-lg font-semibold text-navy-950">
                    Possible duplicate candidates
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
                    Matching details are a prompt to compare the records, not proof that they belong to the same person.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-stone-500">
                  {potentialDuplicates.length} {potentialDuplicates.length === 1 ? 'group' : 'groups'}
                </span>
              </div>
              <div className="divide-y divide-stone-200">
                {potentialDuplicates.map(([key, group]) => (
                  <div key={key} className="grid gap-3 px-5 py-4 md:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {key.startsWith('phone:') ? 'Same phone number' : 'Same name'}
                    </p>
                    <div className="space-y-2">
                      {group.slice(0, 3).map((candidate) => (
                        <p key={candidate.id} className="text-sm">
                          <Link
                            href={
                              candidate.applications[0]
                                ? `/recruitment/applications/${candidate.applications[0].id}`
                                : `/recruitment/search?q=${encodeURIComponent(candidate.user.email)}`
                            }
                            className="font-semibold text-brand-800 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700"
                          >
                            {candidate.legalFirstName} {candidate.lastName}
                          </Link>{' '}
                          <span className="text-stone-500">· {candidate.user.email}</span>
                        </p>
                      ))}
                      {group.length > 3 && (
                        <details className="pt-1">
                          <summary className="cursor-pointer text-sm font-semibold text-brand-800 hover:underline">
                            Show {group.length - 3} more
                          </summary>
                          <div className="mt-3 space-y-2 border-l border-stone-200 pl-4">
                            {group.slice(3).map((candidate) => (
                              <p key={candidate.id} className="text-sm">
                                <Link
                                  href={
                                    candidate.applications[0]
                                      ? `/recruitment/applications/${candidate.applications[0].id}`
                                      : `/recruitment/search?q=${encodeURIComponent(candidate.user.email)}`
                                  }
                                  className="font-semibold text-brand-800 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700"
                                >
                                  {candidate.legalFirstName} {candidate.lastName}
                                </Link>{' '}
                                <span className="text-stone-500">· {candidate.user.email}</span>
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                {!potentialDuplicates.length && (
                  <div className="flex items-center gap-3 px-5 py-6 text-sm text-stone-600 sm:px-6">
                    <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-700" />
                    No likely duplicates were found in the current review set.
                  </div>
                )}
              </div>
            </section>
          )}

          {view === 'duplicates' && isRecruitmentHr && (
            <CandidateMergeManager
              userId={user.userId}
              canApprove={canMakeHrManagerDecision(user.roles)}
              candidates={candidates.map((candidate) => ({
                id: candidate.id,
                name: `${candidate.legalFirstName} ${candidate.lastName}`,
                email: candidate.user.email,
              }))}
            />
          )}

          {view === 'scoring' && (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <section aria-labelledby="reviewer-heading" className="section-panel">
                  <div className="section-heading">
                    <div>
                      <h2 id="reviewer-heading" className="text-lg font-semibold text-navy-950">
                        Screening score differences
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">
                        Candidates scored independently by more than one reviewer.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table min-w-[520px]">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Reviewers</th>
                          <th>Score range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecardVariances.map((item) => (
                          <tr key={item.applicationId}>
                            <td>
                              <Link
                                href={`/recruitment/applications/${item.applicationId}`}
                                className="font-medium text-brand-800 hover:underline"
                              >
                                {item.candidate}
                              </Link>
                              <span className="mt-0.5 block text-xs text-stone-500">{item.vacancy}</span>
                            </td>
                            <td>{item.reviewers}</td>
                            <td className={item.spread >= 20 ? 'font-semibold text-amber-800' : ''}>
                              {item.minimum.toFixed(1)}-{item.maximum.toFixed(1)} ({item.spread.toFixed(1)} difference)
                            </td>
                          </tr>
                        ))}
                        {!scorecardVariances.length && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-stone-500">
                              No comparable screening scorecards yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-stone-200 px-5 py-4 text-xs leading-5 text-stone-500 sm:px-6">
                    A large difference is a prompt to compare the evidence. It is not, by itself, proof that either
                    review is wrong.
                  </p>
                </section>

                <section aria-labelledby="panel-variance-heading" className="section-panel">
                  <div className="section-heading">
                    <div>
                      <h2 id="panel-variance-heading" className="text-lg font-semibold text-navy-950">
                        Panel score differences
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">Interviews scored by more than one panel member.</p>
                    </div>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {variances.map((item) => (
                      <Link
                        key={item.id}
                        href={`/recruitment/interviews#interview-${item.id}`}
                        className="group grid gap-2 px-5 py-4 hover:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                      >
                        <span className="text-sm font-medium text-stone-800">{item.title}</span>
                        <span
                          className={
                            item.spread >= 20 ? 'text-sm font-semibold text-amber-800' : 'text-sm text-stone-600'
                          }
                        >
                          {item.min.toFixed(1)}–{item.max.toFixed(1)} · {item.spread.toFixed(1)} difference
                        </span>
                      </Link>
                    ))}
                    {!variances.length && (
                      <p className="px-5 py-6 text-sm text-stone-600 sm:px-6">No comparisons yet.</p>
                    )}
                  </div>
                </section>
              </div>

              <section aria-labelledby="overrides-heading" className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 id="overrides-heading" className="text-lg font-semibold text-navy-950">
                      Recorded ranking overrides
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">Decisions that did not follow the recorded ranking.</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-500">{overrides.length} recorded</span>
                </div>
                <div className="divide-y divide-stone-200">
                  {overrides.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:px-6"
                    >
                      <Link
                        href={`/recruitment/applications/${item.applicationId}`}
                        className="font-semibold text-brand-800 hover:underline"
                      >
                        {item.application.vacancy.title}
                      </Link>
                      <p className="text-sm leading-6 text-stone-600">
                        <span className="font-medium text-stone-800">{item.outcome}:</span> {item.justification}
                      </p>
                    </div>
                  ))}
                  {!overrides.length && (
                    <p className="px-5 py-6 text-sm text-stone-600 sm:px-6">No overrides recorded.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
