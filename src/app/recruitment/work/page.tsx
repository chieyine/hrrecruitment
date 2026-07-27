import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock3, ListTodo, RefreshCw, ArrowRight } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import WorkItemActions from '@/components/admin/WorkItemActions'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { syncOperationalWorkItems, workItemHref } from '@/lib/work-items'
import { formatDate } from '@/lib/utils'
import { hasStaffRole } from '@/lib/roles'

const filters = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ status?: string; scope?: string; attention?: string }> }) {
  const query = await searchParams
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  const canReadAll = await hasPermission(user.userId, 'application.read.all')
  const canReadAssigned = await hasPermission(user.userId, 'application.read.assigned')
  if (!canReadAll && !canReadAssigned) redirect('/recruitment/dashboard')

  await syncOperationalWorkItems()
  const status = filters.includes(query.status as typeof filters[number]) ? query.status! : 'OPEN'
  const mineOnly = !canReadAll || query.scope !== 'team'
  const now = new Date()
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999)
  const attention = ['overdue', 'today', 'urgent'].includes(query.attention || '') ? query.attention : ''
  const scopeWhere = mineOnly ? {
    OR: [
      { assignedUserId: user.userId },
      { assignedUserId: null, assignedRole: { in: user.roles } },
    ],
  } : {}
  const items = await prisma.workItem.findMany({
    where: {
      ...(attention ? { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } } : { status }),
      ...scopeWhere,
      ...(attention === 'overdue' ? { dueAt: { lt: now } } : {}),
      ...(attention === 'today' ? { dueAt: { gte: now, lte: endOfToday } } : {}),
      ...(attention === 'urgent' ? { priority: 'URGENT' } : {}),
    },
    orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    take: 250,
  })
  const counts = await prisma.workItem.groupBy({
    by: ['status'],
    where: mineOnly ? {
      OR: [
        { assignedUserId: user.userId },
        { assignedUserId: null, assignedRole: { in: user.roles } },
      ],
    } : {},
    _count: true,
  })
  const activeItems = await prisma.workItem.findMany({
    where: { ...scopeWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
    select: { status: true, priority: true, dueAt: true, assignedUserId: true, assignedRole: true },
  })
  const count = Object.fromEntries(counts.map((item) => [item.status, item._count]))
  const overdue = activeItems.filter((item) => item.dueAt && item.dueAt < now).length
  const dueToday = activeItems.filter((item) => item.dueAt && item.dueAt >= now && item.dueAt <= endOfToday).length
  const urgent = activeItems.filter((item) => item.priority === 'URGENT').length
  const blocked = activeItems.filter((item) => item.status === 'BLOCKED').length
  const recentRuns = await prisma.jobRun.findMany({
    where: { jobName: 'PROCESS_SCHEDULES', status: 'COMPLETED', startedAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
    orderBy: { startedAt: 'desc' },
    take: 7,
  })
  const automated = recentRuns.reduce((total, run) => {
    try {
      const summary = JSON.parse(run.summaryJson || '{}') as Record<string, unknown>
      return total + Object.entries(summary).filter(([key, value]) => key.endsWith('Count') && typeof value === 'number').reduce((sum, [, value]) => sum + Number(value), 0)
    } catch {
      return total
    }
  }, 0)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="border-l-4 border-[#d4875f] bg-brand-900 p-7 text-white">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200"><ListTodo className="h-4 w-4" /> Work queue</div>
                <h1 className="font-display text-4xl font-normal">My work</h1>
                <p className="mt-2 max-w-2xl text-sm text-brand-100">Reviews, approvals and candidate actions assigned to you.</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <Link href="/recruitment/work?scope=mine" className={`px-4 py-2 ${mineOnly ? 'bg-white text-brand-950' : 'border border-white/30'}`}>My queue</Link>
                {canReadAll && <Link href="/recruitment/work?scope=team" className={`px-4 py-2 ${!mineOnly ? 'bg-white text-brand-950' : 'border border-white/30'}`}>Team queue</Link>}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ['OPEN', 'Open', ListTodo, 'text-blue-700'],
              ['IN_PROGRESS', 'In progress', Clock3, 'text-purple-700'],
              ['BLOCKED', 'Blocked', AlertTriangle, 'text-amber-700'],
              ['COMPLETED', 'Completed', CheckCircle2, 'text-emerald-700'],
            ].map(([value, label, Icon, colour]) => (
              <Link key={String(value)} href={`/recruitment/work?status=${value}&scope=${mineOnly ? 'mine' : 'team'}`} className={`rounded-2xl border bg-white p-5 shadow-sm ${status === value ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{String(label)}</span><Icon className={`h-5 w-5 ${colour}`} /></div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">{count[String(value)] ?? 0}</div>
              </Link>
            ))}
          </div>

          <section aria-labelledby="attention-heading" className="section-panel">
            <div className="section-heading"><div><h2 id="attention-heading" className="text-lg font-bold text-slate-950">Needs attention</h2><p className="mt-1 text-sm text-slate-600">Exceptions that may delay candidates or require escalation.</p></div>{attention && <Link href={`/recruitment/work?scope=${mineOnly ? 'mine' : 'team'}&status=OPEN`} className="text-sm font-semibold text-blue-700 underline">Clear attention filter</Link>}</div>
            <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-4">
              {[
                ['overdue', 'Overdue', overdue, 'Past the service target'],
                ['today', 'Due today', dueToday, 'Needs action before close'],
                ['urgent', 'Urgent', urgent, 'Highest operational priority'],
                ['blocked', 'Blocked', blocked, 'Waiting on another person or event'],
              ].map(([key, label, value, description]) => key === 'blocked'
                ? <Link key={String(key)} href={`/recruitment/work?scope=${mineOnly ? 'mine' : 'team'}&status=BLOCKED`} className="bg-white p-4 hover:bg-slate-50"><span className="text-xs font-semibold text-slate-600">{label}</span><span className="mt-1 block text-2xl font-bold text-slate-950">{value}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></Link>
                : <Link key={String(key)} href={`/recruitment/work?scope=${mineOnly ? 'mine' : 'team'}&attention=${key}`} className="bg-white p-4 hover:bg-slate-50"><span className="text-xs font-semibold text-slate-600">{label}</span><span className="mt-1 block text-2xl font-bold text-slate-950">{value}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></Link>)}
            </div>
          </section>

          <section aria-labelledby="elsewhere-heading" className="section-panel">
            <div className="section-heading">
              <div>
                <h2 id="elsewhere-heading" className="text-lg font-bold text-slate-950">Elsewhere in recruitment</h2>
                <p className="mt-1 text-sm text-slate-600">Screens that sit outside the work queue.</p>
              </div>
            </div>
            <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['/recruitment/selections', 'Selections', 'Weighted final ranking and selection decisions'],
                ['/recruitment/quality', 'Decision quality', 'Reopened scorecards, overrides and possible duplicates'],
                ['/recruitment/communications', 'Communications', 'Messages and notifications sent to candidates'],
                ['/recruitment/assessments', 'Assessments', 'Create assessments, invite candidates and mark submissions'],
                ['/recruitment/references', 'References', 'Referee requests, reminders and verification'],
                ['/recruitment/accommodations', 'Accommodations', 'Adjustment requests from candidates'],
                ['/recruitment/complaints', 'Complaints', 'Candidate concerns and appeal cases'],
                ['/recruitment/talent-pools', 'Talent pools', 'Consented candidates for future vacancies'],
                ['/recruitment/settings', 'Account security', 'Two-factor authentication and signed-in devices'],
              ].map(([href, label, description]) => (
                <Link key={href} href={href} className="bg-white p-4 transition hover:bg-slate-50">
                  <p className="text-sm font-bold text-slate-950">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="automation-heading" className="section-panel">
            <div className="section-heading">
              <div><h2 id="automation-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><RefreshCw className="h-5 w-5 text-brand-700" />Scheduled activity</h2><p className="mt-1 text-sm text-slate-600">Reminders, expiry checks, escalations and report deliveries completed in the last seven days.</p></div>
              {(user.roles.includes('HR_MANAGER') || user.roles.includes('SYSTEM_ADMIN')) && <Link href="/admin/automations" className="text-sm font-semibold text-brand-700 underline">Manage schedules</Link>}
            </div>
            <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3">
              <div className="bg-white p-4"><p className="text-xs font-semibold text-slate-600">Actions completed</p><p className="mt-1 text-2xl font-bold text-slate-950">{automated}</p></div>
              <div className="bg-white p-4"><p className="text-xs font-semibold text-slate-600">Successful runs</p><p className="mt-1 text-2xl font-bold text-slate-950">{recentRuns.length}</p></div>
              <div className="bg-white p-4"><p className="text-xs font-semibold text-slate-600">Last completed</p><p className="mt-2 text-sm font-bold text-slate-950">{recentRuns[0] ? formatDate(recentRuns[0].completedAt || recentRuns[0].startedAt) : 'No run recorded'}</p></div>
            </div>
          </section>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-bold text-slate-900">{attention ? `${attention.replaceAll('_', ' ')} work` : `${status.replaceAll('_', ' ')} work`}</h2>
              <p className="mt-1 text-xs text-slate-500">Due work appears first. A record closes only when its underlying action is completed.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">There is no work in this queue.</div> : items.map((item) => {
                const isOverdue = Boolean(item.dueAt && item.dueAt < now && item.status !== 'COMPLETED')
                return (
                  <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-700'}`}>{isOverdue ? 'OVERDUE' : item.priority}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{item.workType.replaceAll('_', ' ')}</span>
                      </div>
                      <Link href={workItemHref(item)} className="mt-2 inline-block font-bold text-slate-900 hover:text-blue-700">{item.title}</Link>
                      {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                      <p className="mt-2 text-[11px] text-slate-500">Owner: {item.assignedUserId === user.userId ? 'you' : item.assignedRole ? item.assignedRole.replaceAll('_', ' ').toLowerCase() : 'team queue'} · Due {item.dueAt ? formatDate(item.dueAt) : 'without a configured target'}{item.blockedReason ? ` · Blocked: ${item.blockedReason}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2"><Link href={workItemHref(item)} className="btn-primary">Open record <ArrowRight className="h-4 w-4" /></Link><WorkItemActions id={item.id} status={item.status} lockVersion={item.lockVersion} /></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
