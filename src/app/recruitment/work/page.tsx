import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, ListTodo } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import WorkItemActions from '@/components/admin/WorkItemActions'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { workItemHref } from '@/lib/work-items'
import { formatDate } from '@/lib/utils'
import { hasStaffRole } from '@/lib/roles'

const filters = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const

const statusLabels: Record<(typeof filters)[number], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; scope?: string; attention?: string }>
}) {
  const query = await searchParams
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const canReadAll = await hasPermission(user.userId, 'application.read.all')
  const canReadAssigned = await hasPermission(user.userId, 'application.read.assigned')
  if (!canReadAll && !canReadAssigned) redirect('/recruitment/dashboard')

  const status = filters.includes(query.status as (typeof filters)[number])
    ? (query.status as (typeof filters)[number])
    : 'OPEN'
  const canViewTeam = user.roles.includes('HR_MANAGER')
  const mineOnly = !canViewTeam || query.scope !== 'team'
  const scope = mineOnly ? 'mine' : 'team'
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const attention = ['overdue', 'today', 'urgent'].includes(query.attention || '') ? query.attention : ''
  const scopeWhere = mineOnly
    ? {
        OR: [{ assignedUserId: user.userId }, { assignedUserId: null, assignedRole: { in: user.roles } }],
      }
    : {}

  const [items, counts, activeItems] = await Promise.all([
    prisma.workItem.findMany({
      where: {
        ...(attention ? { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } } : { status }),
        ...scopeWhere,
        ...(attention === 'overdue' ? { dueAt: { lt: now } } : {}),
        ...(attention === 'today' ? { dueAt: { gte: now, lte: endOfToday } } : {}),
        ...(attention === 'urgent' ? { priority: 'URGENT' } : {}),
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 250,
    }),
    prisma.workItem.groupBy({
      by: ['status'],
      where: scopeWhere,
      _count: true,
    }),
    prisma.workItem.findMany({
      where: { ...scopeWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
      select: { status: true, priority: true, dueAt: true },
    }),
  ])

  const count = Object.fromEntries(counts.map((item) => [item.status, item._count]))
  const overdue = activeItems.filter((item) => item.dueAt && item.dueAt < now).length
  const dueToday = activeItems.filter((item) => item.dueAt && item.dueAt >= now && item.dueAt <= endOfToday).length
  const urgent = activeItems.filter((item) => item.priority === 'URGENT').length
  const listTitle = attention
    ? attention === 'today'
      ? 'Due today'
      : `${attention[0]?.toUpperCase()}${attention.slice(1)}`
    : statusLabels[status]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            eyebrow="Recruitment"
            title={mineOnly ? 'My work' : 'Team work'}
            description="Reviews, decisions and candidate follow-ups, ordered by urgency and due date."
            actions={
              canViewTeam ? (
                <div className="inline-flex rounded-lg border border-stone-300 bg-white p-1 shadow-sm">
                  <Link
                    href="/recruitment/work?scope=mine"
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      mineOnly ? 'bg-brand-700 text-white' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    My work
                  </Link>
                  <Link
                    href="/recruitment/work?scope=team"
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      !mineOnly ? 'bg-brand-700 text-white' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Team work
                  </Link>
                </div>
              ) : undefined
            }
          />

          <section aria-label="Work filters" className="rounded-2xl border border-stone-200 bg-white p-3 shadow-soft">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <nav aria-label="Filter by status" className="flex min-w-0 gap-1 overflow-x-auto">
                {filters.map((value) => {
                  const selected = !attention && status === value
                  return (
                    <Link
                      key={value}
                      href={`/recruitment/work?status=${value}&scope=${scope}`}
                      aria-current={selected ? 'page' : undefined}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
                        selected
                          ? 'bg-brand-100 text-brand-950'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-navy-900'
                      }`}
                    >
                      {value === 'OPEN' && <ListTodo className="h-4 w-4" />}
                      {value === 'IN_PROGRESS' && <Clock3 className="h-4 w-4" />}
                      {value === 'BLOCKED' && <AlertTriangle className="h-4 w-4" />}
                      {value === 'COMPLETED' && <CheckCircle2 className="h-4 w-4" />}
                      {statusLabels[value]}
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">{count[value] ?? 0}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Focus</span>
                {[
                  ['overdue', 'Overdue', overdue],
                  ['today', 'Due today', dueToday],
                  ['urgent', 'Urgent', urgent],
                ].map(([key, label, value]) => (
                  <Link
                    key={String(key)}
                    href={`/recruitment/work?scope=${scope}&attention=${key}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      attention === key
                        ? 'border-brand-700 bg-brand-700 text-white'
                        : Number(value) > 0
                          ? 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {label} · {value}
                  </Link>
                ))}
                {attention && (
                  <Link
                    href={`/recruitment/work?scope=${scope}&status=OPEN`}
                    className="px-2 py-1.5 text-xs font-semibold text-brand-800 hover:underline"
                  >
                    Clear
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="work-list-heading" className="section-panel">
            <div className="section-heading">
              <div>
                <h2 id="work-list-heading" className="text-lg font-semibold text-navy-900">
                  {listTitle}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {items.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
                  <h3 className="mt-3 font-semibold text-navy-900">Nothing here</h3>
                  <p className="mt-1 text-sm text-stone-600">There is no work matching this filter.</p>
                </div>
              ) : (
                items.map((item) => {
                  const isOverdue = Boolean(item.dueAt && item.dueAt < now && item.status !== 'COMPLETED')
                  return (
                    <div key={item.id} className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`status-chip ${
                              isOverdue
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-brand-200 bg-brand-50 text-brand-800'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : item.priority.replaceAll('_', ' ').toLowerCase()}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-500">
                            {item.workType.replaceAll('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        <Link
                          href={workItemHref(item)}
                          className="mt-2 inline-block font-semibold text-navy-900 hover:text-brand-800"
                        >
                          {item.title}
                        </Link>
                        {item.description && (
                          <p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p>
                        )}
                        <p className="mt-2 text-xs text-stone-500">
                          {item.assignedUserId === user.userId
                            ? 'Assigned to you'
                            : item.assignedRole
                              ? `Assigned to ${item.assignedRole.replaceAll('_', ' ').toLowerCase()}`
                              : 'In the team queue'}
                          {' · '}
                          {item.dueAt ? `Due ${formatDate(item.dueAt)}` : 'No due date'}
                          {item.blockedReason ? ` · Waiting for: ${item.blockedReason}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Link href={workItemHref(item)} className="btn-primary">
                          Open <ArrowRight className="h-4 w-4" />
                        </Link>
                        <WorkItemActions id={item.id} status={item.status} lockVersion={item.lockVersion} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
