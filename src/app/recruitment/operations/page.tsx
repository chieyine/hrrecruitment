import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

export default async function OperationsDashboardPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!await hasPermission(user.userId, 'application.read.all')) redirect('/recruitment/dashboard')
  const now = new Date()
  const stale = new Date(now.getTime() - 3 * 86_400_000)
  const [unassigned, stuck, marking, panelPending, references, expiringOffers, overdueForms, overdueDocs, overdueCourses, overdueTasks, erpPending, deadLetters, criticalEvents, lastJob] = await Promise.all([
    prisma.application.count({ where: { internalStatus: 'SUBMITTED', assignedReviewerId: null } }),
    prisma.application.findMany({ where: { internalStatus: { notIn: ['TRANSFERRED_TO_ERP','WITHDRAWN','CANCELLED','NOT_SELECTED'] }, updatedAt: { lt: stale } }, include: { candidate: true, vacancy: true }, take: 30, orderBy: { updatedAt: 'asc' } }),
    prisma.candidateAssessment.count({ where: { status: { in: ['SUBMITTED','AUTO_SUBMITTED'] } } }),
    prisma.interviewPanelMember.count({ where: { submission: null, interview: { scheduledEnd: { lt: now }, status: { not: 'CANCELLED' } } } }),
    prisma.referenceRequest.count({ where: { status: { in: ['PENDING','SENT'] }, expiresAt: { lte: new Date(now.getTime()+2*86_400_000) } } }),
    prisma.offer.count({ where: { status: { in: ['SENT','VIEWED'] }, acceptanceDeadline: { lte: new Date(now.getTime()+2*86_400_000) } } }),
    prisma.candidatePreboardingForm.count({ where: { required: true, dueAt: { lt: now }, status: { notIn: ['APPROVED','WAIVED'] } } }),
    prisma.candidateRequiredDocument.count({ where: { required: true, dueAt: { lt: now }, status: { notIn: ['APPROVED','WAIVED'] } } }),
    prisma.candidateCourse.count({ where: { required: true, dueAt: { lt: now }, status: { notIn: ['COMPLETED','WAIVED'] } } }),
    prisma.candidatePreboardingTask.count({ where: { required: true, dueAt: { lt: now }, status: { notIn: ['COMPLETED','APPROVED','WAIVED'] } } }),
    prisma.application.count({ where: { internalStatus: 'RESUMED', erpTransferRecord: null } }),
    prisma.outboxMessage.count({ where: { status: 'DEAD_LETTER' } }),
    prisma.operationalEvent.count({ where: { resolvedAt: null, severity: { in: ['ERROR','CRITICAL'] } } }),
    prisma.jobRun.findFirst({ where: { jobName: 'PROCESS_SCHEDULES' }, orderBy: { startedAt: 'desc' } }),
  ])
  const metrics = [
    ['Applications unassigned',unassigned,'/recruitment/applications'],['Assessments awaiting marking',marking,'/recruitment/assessments'],['Panel scores overdue',panelPending,'/recruitment/interviews'],['References due/overdue',references,'/recruitment/references'],['Offers near expiry',expiringOffers,'/recruitment/offers'],['Overdue forms',overdueForms,'/recruitment/preboarding'],['Overdue documents',overdueDocs,'/recruitment/preboarding'],['Overdue courses',overdueCourses,'/recruitment/preboarding'],['Overdue tasks',overdueTasks,'/recruitment/preboarding'],['Resumed awaiting ERP',erpPending,'/recruitment/preboarding'],['Dead-letter messages',deadLetters,'/admin/system-settings'],['Critical system events',criticalEvents,'/recruitment/audit'],
  ] as const
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-10"><div className="mx-auto max-w-7xl space-y-7 px-4"><div><h1 className="text-2xl font-extrabold">Recruitment operations and SLA dashboard</h1><p className="text-sm text-slate-600">Action queues, overdue work, delivery health and stalled candidates.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value,href])=><Link key={label} href={href} className={`rounded-2xl border bg-white p-5 shadow-sm ${value>0?'border-amber-300':''}`}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></Link>)}</div><div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Scheduler health</h2><p className="mt-2 text-sm">Last run: {lastJob?`${lastJob.status} at ${lastJob.startedAt.toLocaleString()}`:'No run recorded'}</p></div><div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Candidates without activity for more than three days</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Candidate</th><th>Vacancy</th><th>Stage</th><th>Owner</th><th>Last update</th></tr></thead><tbody>{stuck.map((item)=><tr key={item.id} className="border-t"><td className="py-3"><Link className="font-bold text-blue-700" href={`/recruitment/applications/${item.id}`}>{item.candidate.legalFirstName} {item.candidate.lastName}</Link></td><td>{item.vacancy.title}</td><td>{item.internalStatus.replace(/_/g,' ')}</td><td>{item.assignedReviewerId?'Assigned':'Unassigned'}</td><td>{item.updatedAt.toLocaleString()}</td></tr>)}</tbody></table>{stuck.length===0&&<p className="py-6 text-center text-slate-500">No stalled active applications.</p>}</div></div></div></main><Footer/></div>
}
