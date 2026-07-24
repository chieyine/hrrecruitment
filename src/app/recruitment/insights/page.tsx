import Link from 'next/link'
import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

function days(milliseconds: number) { return Math.round(milliseconds / 86400000 * 10) / 10 }
function median(values: number[]) {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

export default async function RecruitmentInsightsPage() {
  const user = await getVerifiedUser()
  if (!user || !await hasPermission(user.userId, 'report.export')) redirect('/recruitment/dashboard')
  const now = new Date()
  const [applications, vacancies, submissions, offers, preboardings, openWork, deliveryFailures, supportRequests, automationActions, bulkRuns, auditTouches] = await Promise.all([
    prisma.application.findMany({ include: { vacancy: { include: { department: true } }, stageHistory: { orderBy: { createdAt: 'asc' } } }, take: 20000 }),
    prisma.vacancy.findMany({ include: { department: true, applications: { select: { id: true, internalStatus: true, submittedAt: true, updatedAt: true } } }, take: 5000 }),
    prisma.interviewPanelSubmission.findMany({ include: { interview: { include: { application: { include: { vacancy: true } } } } }, take: 20000 }),
    prisma.offer.findMany({ include: { application: { include: { vacancy: true } }, }, take: 10000 }),
    prisma.candidatePreboarding.findMany({ include: { application: { include: { vacancy: true } } }, take: 10000 }),
    prisma.workItem.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } }, take: 20000 }),
    prisma.outboxMessage.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    prisma.complaintCase.count({ where: { category: { in: ['COMPLAINT', 'APPEAL', 'ACCOMMODATION', 'OTHER'] } } }),
    prisma.automationActionLog.count({ where: { status: 'COMPLETED' } }),
    prisma.bulkActionRun.findMany({ orderBy: { createdAt: 'desc' }, take: 10000 }),
    prisma.auditLog.groupBy({ by: ['resourceId'], where: { resourceType: 'Application' }, _count: true }),
  ])

  const stageDurations = new Map<string, number[]>()
  for (const application of applications) {
    const events = application.stageHistory
    for (let index = 0; index < events.length; index++) {
      const event = events[index]
      const end = events[index + 1]?.createdAt || application.updatedAt
      const values = stageDurations.get(event.toStatus) || []
      values.push(end.getTime() - event.createdAt.getTime())
      stageDurations.set(event.toStatus, values)
    }
  }
  const stageRows = [...stageDurations.entries()].map(([stage, values]) => ({ stage, median: days(median(values)), cases: values.length })).sort((a, b) => b.median - a.median)
  const withdrawalRate = applications.length ? applications.filter((item) => item.internalStatus === 'WITHDRAWN').length / applications.length * 100 : 0
  const vacancyRows = vacancies.map((vacancy) => {
    const active = vacancy.applications.filter((item) => !['WITHDRAWN', 'CANCELLED', 'NOT_SELECTED', 'TRANSFERRED_TO_ERP'].includes(item.internalStatus))
    const oldest = active.map((item) => item.submittedAt?.getTime()).filter((value): value is number => Boolean(value)).sort()[0]
    return { id: vacancy.id, reference: vacancy.referenceNumber, title: vacancy.title, department: vacancy.department.name, active: active.length, age: oldest ? days(now.getTime() - oldest) : 0 }
  }).sort((a, b) => b.age - a.age)
  const panelGroups = new Map<string, typeof submissions>()
  for (const item of submissions) { const group = panelGroups.get(item.interviewId) || []; group.push(item); panelGroups.set(item.interviewId, group) }
  const panelVariance = [...panelGroups.values()].filter((items) => items.length > 1).map((items) => ({ interviewId: items[0].interviewId, vacancy: items[0].interview.application.vacancy.title, spread: Math.max(...items.map(item => item.totalScore)) - Math.min(...items.map(item => item.totalScore)), panelists: items.length })).sort((a, b) => b.spread - a.spread)
  const declineReasons = new Map<string, number>()
  for (const offer of offers.filter(item => item.status === 'DECLINED')) { const reason = offer.candidateComment?.trim() || 'No reason recorded'; declineReasons.set(reason, (declineReasons.get(reason) || 0) + 1) }
  const atRisk = preboardings.filter(item => item.confirmedStartDate && item.confirmedStartDate <= new Date(now.getTime() + 7 * 86400000) && item.readinessStatus !== 'READY_TO_RESUME')
  const departmentOutcomes = new Map<string, { total: number; progressed: number; withdrawn: number }>()
  for (const item of applications) { const current = departmentOutcomes.get(item.vacancy.department.name) || { total: 0, progressed: 0, withdrawn: 0 }; current.total++; if (['RECOMMENDED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'PREBOARDING', 'READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(item.internalStatus)) current.progressed++; if (item.internalStatus === 'WITHDRAWN') current.withdrawn++; departmentOutcomes.set(item.vacancy.department.name, current) }
  const shortlistDurations = applications.flatMap(item => {
    const submitted = item.submittedAt
    const shortlisted = item.stageHistory.find(event => event.toStatus === 'SHORTLISTED')?.createdAt
    return submitted && shortlisted ? [shortlisted.getTime() - submitted.getTime()] : []
  })
  const awaitingManager = openWork.filter(item => item.assignedRole === 'HIRING_MANAGER').map(item => item.createdAt.getTime())
  const preboardingBeforeStart = preboardings.filter(item => item.confirmedStartDate && item.readinessStatus === 'READY_TO_RESUME' && Boolean(item.readyAt && item.readyAt <= item.confirmedStartDate)).length
  const abandonment = applications.filter(item => item.internalStatus === 'DRAFT' && item.updatedAt < new Date(now.getTime() - 3 * 86400000)).length
  const totalBulk = bulkRuns.reduce((sum, item) => sum + item.requestedCount, 0)
  const bulkFailures = bulkRuns.reduce((sum, item) => sum + item.failedCount, 0)
  const touches = auditTouches.reduce((sum, item) => sum + item._count, 0)
  const metrics = [
    ['Close to shortlist', `${days(median(shortlistDurations))} days`, 'Median elapsed time for applications that reached shortlist.', '/recruitment/applications'],
    ['HR touches per application', applications.length ? (touches / applications.length).toFixed(1) : '0', 'Direct application audit actions divided by applications.', '/recruitment/audit'],
    ['Overdue work items', String(openWork.filter(item => item.dueAt && item.dueAt < now).length), 'Open work beyond its service target.', '/recruitment/work?attention=overdue'],
    ['Awaiting hiring manager', awaitingManager.length ? `${days(median(awaitingManager.map(value => now.getTime() - value)))} days` : '0 days', 'Median age of work assigned to hiring managers.', '/recruitment/work?scope=team'],
    ['Candidate support cases', String(supportRequests), 'Candidate complaints, appeals, accommodations and other support cases.', '/recruitment/complaints'],
    ['Message delivery failures', String(deliveryFailures), 'Failed or dead-letter outbound messages.', '/admin/system-settings'],
    ['Application abandonment', String(abandonment), 'Drafts inactive for more than three days.', '/recruitment/applications'],
    ['Ready before start date', `${preboardings.length ? Math.round(preboardingBeforeStart / preboardings.length * 100) : 0}%`, 'Preboarding cases ready on or before the confirmed start date.', '/recruitment/preboarding'],
    ['Automated actions', String(automationActions), 'Successfully completed automation actions retained in the action log.', '/admin/automations'],
    ['Bulk action error rate', `${totalBulk ? (bulkFailures / totalBulk * 100).toFixed(1) : '0.0'}%`, 'Per-record failures across recorded bulk operations.', '/recruitment/applications'],
  ] as const

  return <div className="flex min-h-screen flex-col bg-stone-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="page-shell space-y-7">
    <div className="page-intro"><p className="editorial-kicker">Management insight</p><h1 className="page-title">Recruitment decisions and workload</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Where work is slowing down, which outcomes need attention, and whether the platform is reducing manual follow-up.</p></div>
    <section className="section-panel"><h2 className="text-lg font-bold">Platform outcomes</h2><div className="mt-4 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label,value,description,href])=><Link key={label} href={href} className="bg-white p-4 hover:bg-slate-50"><span className="text-xs font-semibold text-slate-600">{label}</span><span className="mt-1 block text-2xl font-bold text-slate-950">{value}</span><span className="mt-2 block text-[11px] leading-4 text-slate-500">{description}</span></Link>)}</div></section>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="section-panel"><h2 className="font-bold">Where candidates are getting stuck</h2><p className="mt-1 text-xs text-slate-500">Median time spent after entering each stage.</p><table className="data-table mt-3"><thead><tr><th>Stage</th><th>Median days</th><th>Cases</th></tr></thead><tbody>{stageRows.slice(0,12).map(row=><tr key={row.stage}><td><Link href={`/recruitment/applications?stage=${row.stage}`} className="font-semibold text-blue-700 underline">{row.stage.replaceAll('_',' ')}</Link></td><td>{row.median}</td><td>{row.cases}</td></tr>)}</tbody></table></section>
      <section className="section-panel"><h2 className="font-bold">Vacancies taking longest</h2><table className="data-table mt-3"><thead><tr><th>Vacancy</th><th>Team</th><th>Oldest active case</th></tr></thead><tbody>{vacancyRows.slice(0,12).map(row=><tr key={row.id}><td><Link href={`/recruitment/vacancies/${row.id}/applications`} className="font-semibold text-blue-700 underline">{row.reference} · {row.title}</Link></td><td>{row.department}</td><td>{row.age} days</td></tr>)}</tbody></table></section>
      <section className="section-panel"><h2 className="font-bold">Panel scoring consistency</h2><table className="data-table mt-3"><thead><tr><th>Vacancy</th><th>Score spread</th><th>Panelists</th></tr></thead><tbody>{panelVariance.slice(0,12).map(row=><tr key={row.interviewId}><td><Link href={`/recruitment/interviews/${row.interviewId}`} className="font-semibold text-blue-700 underline">{row.vacancy}</Link></td><td>{row.spread.toFixed(1)}</td><td>{row.panelists}</td></tr>)}</tbody></table></section>
      <section className="section-panel"><h2 className="font-bold">Offer declines</h2><p className="mt-1 text-xs text-slate-500">{withdrawalRate.toFixed(1)}% candidate withdrawal rate across all recorded applications.</p><table className="data-table mt-3"><thead><tr><th>Recorded reason</th><th>Offers</th></tr></thead><tbody>{[...declineReasons.entries()].sort((a,b)=>b[1]-a[1]).map(([reason,count])=><tr key={reason}><td><Link href="/recruitment/offers" className="text-blue-700 underline">{reason}</Link></td><td>{count}</td></tr>)}</tbody></table></section>
      <section className="section-panel"><h2 className="font-bold">New starters at risk</h2><p className="mt-2 text-3xl font-bold">{atRisk.length}</p><p className="mt-1 text-sm text-slate-600">Start within seven days and not ready to resume.</p><Link href="/recruitment/preboarding" className="mt-3 inline-block text-sm font-semibold text-blue-700 underline">Open underlying preboarding cases</Link></section>
      <section className="section-panel"><h2 className="font-bold">Outcomes by permitted operational dimension</h2><p className="mt-1 text-xs text-slate-500">Department is shown as an operational dimension. Protected candidate characteristics are excluded from this view.</p><table className="data-table mt-3"><thead><tr><th>Department</th><th>Applications</th><th>Progressed</th><th>Withdrawn</th></tr></thead><tbody>{[...departmentOutcomes.entries()].map(([department,value])=><tr key={department}><td><Link href={`/recruitment/search?q=${encodeURIComponent(department)}`} className="text-blue-700 underline">{department}</Link></td><td>{value.total}</td><td>{value.progressed}</td><td>{value.withdrawn}</td></tr>)}</tbody></table></section>
    </div>
  </div></main><Footer/></div>
}
