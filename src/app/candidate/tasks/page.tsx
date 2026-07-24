import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'

type CandidateTask = { key: string; title: string; context: string; href: string; dueAt: Date | null; priority: number }

export default async function CandidateTasksPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const now = new Date()
  const [assessments, interviews, offers, forms, documents, policies, courses, tasks, information, meetings, startDates] = await Promise.all([
    prisma.candidateAssessment.findMany({
      where: { application: { candidate: { userId: user.userId } }, status: { in: ['INVITED', 'NOT_STARTED', 'IN_PROGRESS'] } },
      select: { id: true, status: true, assessment: { select: { title: true, closesAt: true } }, application: { select: { vacancy: { select: { title: true } } } } },
    }),
    prisma.interview.findMany({
      where: { application: { candidate: { userId: user.userId } }, status: { notIn: ['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'] }, candidateResponse: null },
      select: { id: true, title: true, scheduledStart: true, application: { select: { vacancy: { select: { title: true } } } } },
    }),
    prisma.offer.findMany({
      where: { application: { candidate: { userId: user.userId } }, status: { in: ['SENT', 'VIEWED'] } },
      select: { id: true, position: true, acceptanceDeadline: true },
    }),
    prisma.candidatePreboardingForm.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'] } },
      select: { id: true, dueAt: true, formTemplate: { select: { title: true } } },
    }),
    prisma.candidateRequiredDocument.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { in: ['NOT_SUBMITTED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED'] } },
      select: { id: true, dueAt: true, documentRequirement: { select: { name: true } } },
    }),
    prisma.candidatePolicyAcknowledgement.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { notIn: ['SIGNED', 'APPROVED', 'WAIVED'] } },
      select: { id: true, dueAt: true, policyDocument: { select: { title: true } } },
    }),
    prisma.candidateCourse.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { notIn: ['COMPLETED', 'WAIVED'] } },
      select: { id: true, dueAt: true, course: { select: { title: true } } },
    }),
    prisma.candidatePreboardingTask.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'] } },
      select: { id: true, dueAt: true, taskTemplate: { select: { title: true } } },
    }),
    prisma.candidateInformationItem.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, acknowledgementRequired: true, acknowledgedAt: null },
      select: { id: true, title: true },
    }),
    prisma.preboardingMeeting.findMany({
      where: { candidatePreboarding: { application: { candidate: { userId: user.userId } } }, required: true, status: { in: ['SCHEDULED', 'CONFIRMED'] }, candidateResponse: null },
      select: { id: true, title: true, scheduledStart: true },
    }),
    prisma.candidatePreboarding.findMany({
      where: { startDateConfirmedAt: null, application: { offers: { some: { status: 'ACCEPTED' } }, candidate: { userId: user.userId } } },
      select: { id: true, application: { select: { vacancy: { select: { title: true } }, offers: { where: { status: 'ACCEPTED' }, orderBy: { acceptedAt: 'desc' }, take: 1, select: { startDate: true } } } } },
    }),
  ])
  const items: CandidateTask[] = [
    ...assessments.map((item) => ({ key: `assessment-${item.id}`, title: `${item.status === 'IN_PROGRESS' ? 'Continue' : 'Start'} assessment: ${item.assessment.title}`, context: item.application.vacancy.title, href: `/candidate/assessments/${item.id}`, dueAt: item.assessment.closesAt, priority: 1 })),
    ...interviews.map((item) => ({ key: `interview-${item.id}`, title: `Respond to interview: ${item.title}`, context: item.application.vacancy.title, href: '/candidate/interviews', dueAt: item.scheduledStart, priority: 1 })),
    ...offers.map((item) => ({ key: `offer-${item.id}`, title: `Respond to offer: ${item.position}`, context: 'Offer decision', href: `/candidate/offers/${item.id}`, dueAt: item.acceptanceDeadline, priority: 0 })),
    ...forms.map((item) => ({ key: `form-${item.id}`, title: `Complete form: ${item.formTemplate.title}`, context: 'Preboarding', href: '/candidate/preboarding/forms', dueAt: item.dueAt, priority: 2 })),
    ...documents.map((item) => ({ key: `document-${item.id}`, title: `Submit document: ${item.documentRequirement.name}`, context: 'Preboarding', href: '/candidate/preboarding/documents', dueAt: item.dueAt, priority: 2 })),
    ...policies.map((item) => ({ key: `policy-${item.id}`, title: `Read and sign: ${item.policyDocument.title}`, context: 'Preboarding policy', href: '/candidate/preboarding/policies', dueAt: item.dueAt, priority: 2 })),
    ...courses.map((item) => ({ key: `course-${item.id}`, title: `Complete course: ${item.course.title}`, context: 'Preboarding', href: '/candidate/preboarding/courses', dueAt: item.dueAt, priority: 2 })),
    ...tasks.map((item) => ({ key: `task-${item.id}`, title: item.taskTemplate.title, context: 'Preboarding task', href: '/candidate/preboarding/tasks', dueAt: item.dueAt, priority: 2 })),
    ...information.map((item) => ({ key: `information-${item.id}`, title: `Acknowledge: ${item.title}`, context: 'Reporting information', href: '/candidate/preboarding/reporting-information', dueAt: null, priority: 2 })),
    ...meetings.map((item) => ({ key: `meeting-${item.id}`, title: `Respond to meeting: ${item.title}`, context: 'Preboarding meeting', href: '/candidate/preboarding/meetings', dueAt: item.scheduledStart, priority: 1 })),
    ...startDates.map((item) => ({ key: `start-date-${item.id}`, title: `Confirm your start date for ${item.application.vacancy.title}`, context: 'Preboarding', href: '/candidate/preboarding', dueAt: item.application.offers[0]?.startDate || null, priority: 1 })),
  ].sort((a, b) => (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) || a.priority - b.priority)
  const overdue = items.filter((item) => item.dueAt && item.dueAt < now).length
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="mx-auto max-w-4xl space-y-6 px-4"><div className="border-b border-slate-300 pb-5"><h1 className="text-3xl font-bold text-slate-900">Tasks</h1><p className="mt-2 text-sm text-slate-600">Assessments, interview replies, offers and preboarding items that need your attention.</p></div>{overdue>0&&<div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"><AlertCircle className="h-5 w-5"/>{overdue} item{overdue===1?' is':'s are'} overdue. Contact HR if you need help or an adjustment.</div>}<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{items.length===0?<div className="p-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600"/><h2 className="mt-3 font-bold">No outstanding tasks</h2><p className="mt-1 text-sm text-slate-500">We will list new tasks here when they are assigned.</p></div>:<div className="divide-y divide-slate-100">{items.map((item)=>{const isOverdue=Boolean(item.dueAt&&item.dueAt<now);return <Link key={item.key} href={item.href} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"><div><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.context}</p></div><div className={`shrink-0 text-right text-xs font-bold ${isOverdue?'text-red-700':'text-slate-600'}`}><Clock3 className="mb-1 ml-auto h-4 w-4"/>{item.dueAt?`${isOverdue?'Overdue · ':''}${formatDateTime(item.dueAt)}`:'No deadline'}</div></Link>})}</div>}</div><Link href="/candidate/accommodations" className="inline-block text-sm font-semibold text-blue-700 hover:underline">Request an adjustment or accommodation</Link></div></main><Footer/></div>
}
