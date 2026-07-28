import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Search,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDateTime, getStatusBadgeClass } from '@/lib/utils'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'
import { workItemHref } from '@/lib/work-items'

const TERMINAL_STAGES = [
  'TRANSFERRED_TO_ERP',
  'WITHDRAWN',
  'CANCELLED',
  'NOT_SELECTED',
  'INELIGIBLE',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
]

function stageLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export default async function RecruitmentDashboardPage() {
  const user = await getVerifiedUser()

  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  if (user.roles.includes('APPROVER') && !user.roles.includes('HR_MANAGER')) redirect('/recruitment/approvals')
  if (user.roles.includes('PANEL_MEMBER') && user.roles.every((role) => role === 'PANEL_MEMBER'))
    redirect('/recruitment/interviews')
  if (user.roles.includes('COURSE_ADMIN') && user.roles.every((role) => role === 'COURSE_ADMIN'))
    redirect('/admin/courses')

  const [readAll, readAssigned, canCreateVacancy] = await Promise.all([
    hasPermission(user.userId, 'vacancy.read.all'),
    hasPermission(user.userId, 'vacancy.read.assigned'),
    hasPermission(user.userId, 'vacancy.create.all'),
  ])
  if (!readAll && !readAssigned) redirect('/')

  const vacancyWhere = readAll ? {} : { ownerUserId: user.userId }
  const applicationWhere = readAll
    ? {}
    : {
        OR: [
          { assignedReviewerId: user.userId },
          { vacancy: { ownerUserId: user.userId } },
          { interviews: { some: { panelMembers: { some: { userId: user.userId } } } } },
        ],
      }
  const workScope = readAll
    ? {}
    : {
        OR: [{ assignedUserId: user.userId }, { assignedUserId: null, assignedRole: { in: user.roles } }],
      }
  const now = new Date()

  const [
    totalVacancies,
    openVacancies,
    totalApplications,
    pendingReview,
    activeApplications,
    preboardingActive,
    readyForErp,
    createdInErp,
    groupedStages,
    recentApplications,
    attentionItems,
    overdueWork,
  ] = await Promise.all([
    prisma.vacancy.count({ where: vacancyWhere }),
    prisma.vacancy.count({ where: { ...vacancyWhere, status: 'OPEN' } }),
    prisma.application.count({ where: applicationWhere }),
    prisma.application.count({ where: { AND: [applicationWhere, { internalStatus: 'SUBMITTED' }] } }),
    prisma.application.count({ where: { AND: [applicationWhere, { internalStatus: { notIn: TERMINAL_STAGES } }] } }),
    readAll
      ? prisma.candidatePreboarding.count({ where: { status: { in: ['IN_PROGRESS', 'AWAITING_HR_REVIEW'] } } })
      : Promise.resolve(0),
    readAll ? prisma.application.count({ where: { internalStatus: 'READY_TO_RESUME' } }) : Promise.resolve(0),
    readAll ? prisma.application.count({ where: { internalStatus: 'TRANSFERRED_TO_ERP' } }) : Promise.resolve(0),
    prisma.application.groupBy({ by: ['internalStatus'], where: applicationWhere, _count: true }),
    prisma.application.findMany({
      where: applicationWhere,
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        candidate: { include: { user: { select: { email: true } } } },
        vacancy: { include: { department: true } },
      },
    }),
    prisma.workItem.findMany({
      where: { ...workScope, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 5,
    }),
    prisma.workItem.count({
      where: { ...workScope, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { lt: now } },
    }),
  ])

  const stageCounts = Object.fromEntries(groupedStages.map((stage) => [stage.internalStatus, stage._count]))
  const pipeline = [
    { label: 'New', detail: 'Submitted', value: stageCounts.SUBMITTED || 0 },
    {
      label: 'Screening',
      detail: 'Longlist and shortlist',
      value: (stageCounts.LONGLISTED || 0) + (stageCounts.SHORTLISTED || 0),
    },
    {
      label: 'Evaluation',
      detail: 'Assessment and interview',
      value: ['ASSESSMENT_INVITED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_COMPLETED'].reduce(
        (sum, stage) => sum + (stageCounts[stage] || 0),
        0
      ),
    },
    {
      label: 'Decision',
      detail: 'Reference through offer',
      value: ['REFERENCE_CHECK', 'RECOMMENDED', 'OFFER_SENT', 'OFFER_ACCEPTED'].reduce(
        (sum, stage) => sum + (stageCounts[stage] || 0),
        0
      ),
    },
    {
      label: 'Preboarding',
      detail: 'Preparing to start',
      value: ['PREBOARDING_IN_PROGRESS', 'READY_TO_RESUME'].reduce((sum, stage) => sum + (stageCounts[stage] || 0), 0),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-7">
          <section className="workspace-band grid lg:grid-cols-[1.5fr_.8fr]">
            <div className="px-6 py-7 sm:px-8 sm:py-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
                Recruitment command centre
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Keep every candidate moving.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100">
                Start with overdue work, then review new applications and decisions waiting on the team.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/recruitment/work"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-brand-950 hover:bg-brand-50"
                >
                  Open my work <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/recruitment/search"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  <Search className="h-4 w-4" /> Find a record
                </Link>
                {canCreateVacancy && (
                  <Link
                    href="/recruitment/vacancies/new"
                    className="inline-flex min-h-10 items-center rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                  >
                    Create vacancy
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-white/10 bg-white/[.045] lg:border-l lg:border-t-0">
              <div className="border-b border-r border-white/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand-300">Active cases</p>
                <p className="mt-2 text-3xl font-semibold text-white">{activeApplications}</p>
              </div>
              <div className="border-b border-white/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand-300">New review</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingReview}</p>
              </div>
              <div className="border-r border-white/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand-300">Overdue work</p>
                <p className={`mt-2 text-3xl font-semibold ${overdueWork ? 'text-[#efaa8b]' : 'text-white'}`}>
                  {overdueWork}
                </p>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand-300">Open roles</p>
                <p className="mt-2 text-3xl font-semibold text-white">{openVacancies}</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="pipeline-heading" className="section-panel">
            <div className="section-heading">
              <div>
                <h2 id="pipeline-heading" className="text-lg font-semibold text-navy-900">
                  Live pipeline
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {totalApplications} applications across {totalVacancies} vacancies
                </p>
              </div>
              <Link href="/recruitment/applications" className="text-xs font-bold text-brand-800 hover:underline">
                View all candidates
              </Link>
            </div>
            <div className="grid divide-y divide-stone-200 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
              {pipeline.map((stage, index) => (
                <div key={stage.label} className="relative p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-stone-700">{stage.label}</p>
                    <span className="text-[10px] font-bold text-stone-400">0{index + 1}</span>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900">{stage.value}</p>
                  <p className="mt-1 text-[11px] text-stone-500">{stage.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.55fr_.8fr]">
            <section aria-labelledby="activity-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="activity-heading" className="text-lg font-semibold text-navy-900">
                    Recent movement
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Candidate records changed most recently.</p>
                </div>
              </div>
              {recentApplications.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No applications yet"
                    description="New applications will appear here as candidates submit them."
                  />
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {recentApplications.map((application) => (
                    <Link
                      key={application.id}
                      href={`/recruitment/applications/${application.id}`}
                      className="grid gap-3 px-5 py-4 transition hover:bg-stone-50 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-navy-900">
                            {application.candidate.legalFirstName} {application.candidate.lastName}
                          </p>
                          <span className={`status-chip ${getStatusBadgeClass(application.internalStatus)}`}>
                            {stageLabel(application.internalStatus)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-stone-500">
                          {application.vacancy.referenceNumber} · {application.vacancy.title} ·{' '}
                          {application.vacancy.department.name}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-stone-500">{formatDateTime(application.updatedAt)}</p>
                        <p className="mt-1 text-[11px] font-semibold text-brand-800">Open record →</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="attention-heading" className="section-panel">
              <div className="section-heading">
                <div>
                  <h2 id="attention-heading" className="text-lg font-semibold text-navy-900">
                    Needs attention
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">Your next five active items.</p>
                </div>
              </div>
              {attentionItems.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={CheckCircle2}
                    title="Queue clear"
                    description="There is no open or blocked work assigned to you."
                  />
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {attentionItems.map((item) => {
                    const overdue = Boolean(item.dueAt && item.dueAt < now)
                    return (
                      <Link key={item.id} href={workItemHref(item)} className="block px-5 py-4 hover:bg-stone-50">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${overdue ? 'bg-rose-50 text-rose-700' : item.status === 'BLOCKED' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}
                          >
                            {overdue || item.status === 'BLOCKED' ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock3 className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 text-navy-900">{item.title}</p>
                            <p className="mt-1 text-[11px] text-stone-500">
                              {overdue
                                ? 'Overdue'
                                : item.dueAt
                                  ? `Due ${formatDateTime(item.dueAt)}`
                                  : 'No target date'}{' '}
                              · {stageLabel(item.priority)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  <Link
                    href="/recruitment/work"
                    className="flex items-center justify-between bg-stone-50 px-5 py-3 text-xs font-bold text-brand-800 hover:bg-brand-50"
                  >
                    Open the full work queue <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section aria-labelledby="operations-heading">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 id="operations-heading" className="text-lg font-semibold tracking-[-.02em] text-navy-900">
                  Operational picture
                </h2>
                <p className="mt-1 text-sm text-stone-600">A quick read on the work beyond screening.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Open vacancies',
                  value: `${openVacancies} / ${totalVacancies}`,
                  detail: 'Accepting applications',
                  href: '/recruitment/vacancies',
                  icon: BriefcaseBusiness,
                },
                {
                  label: 'Active preboarding',
                  value: preboardingActive,
                  detail: 'Candidates completing requirements',
                  href: '/recruitment/preboarding',
                  icon: FileCheck2,
                },
                {
                  label: 'Ready for ERP',
                  value: readyForErp,
                  detail: 'Cleared for personnel creation',
                  href: '/recruitment/preboarding',
                  icon: UserRoundCheck,
                },
                {
                  label: 'Handover complete',
                  value: createdInErp,
                  detail: 'Transferred into the HR system',
                  href: '/recruitment/reports',
                  icon: UsersRound,
                },
              ].map(({ label, value, detail, href, icon: Icon }) => (
                <Link key={label} href={href} className="metric-card group">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[.11em] text-stone-500">{label}</p>
                    <Icon className="h-4 w-4 text-brand-700" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900">{value}</p>
                  <p className="mt-1 text-xs text-stone-500">{detail}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
