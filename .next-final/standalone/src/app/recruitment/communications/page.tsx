import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import MessageComposer from '@/components/shared/MessageComposer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'

export default async function CommunicationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!await hasPermission(user.userId, 'application.read.all')) redirect('/recruitment/dashboard')
  const [threads, outboxHealth] = await Promise.all([
    prisma.messageThread.findMany({
      include: {
        application: {
          select: {
            id: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { referenceNumber: true, title: true } },
          },
        },
        messages: { orderBy: { sentAt: 'desc' }, take: 20 },
      },
      orderBy: { id: 'desc' },
      take: 100,
    }),
    prisma.outboxMessage.groupBy({ by: ['status'], _count: true }),
  ])
  const statusCounts = Object.fromEntries(outboxHealth.map((item) => [item.status, item._count]))
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="mx-auto max-w-6xl space-y-6 px-4"><div className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Governed communications</p><h1 className="mt-2 text-3xl font-extrabold">Candidate communications</h1><p className="mt-2 text-sm text-slate-300">A complete application-linked record of candidate and HR messages, with reliable email delivery through the encrypted outbox.</p></div><div className="grid gap-3 sm:grid-cols-4">{['PENDING','DELIVERED','FAILED','DEAD_LETTER'].map((status)=><div key={status} className="rounded-2xl border bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-500">{status.replace('_',' ')}</p><p className="mt-1 text-2xl font-extrabold">{statusCounts[status]||0}</p></div>)}</div><div className="space-y-4">{threads.map((thread)=><div key={thread.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 md:flex-row"><div><div className="flex gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{thread.category}</span>{thread.restricted&&<span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">RESTRICTED</span>}</div><h2 className="mt-2 font-bold">{thread.subject}</h2><p className="text-xs text-slate-500">{thread.application.candidate.legalFirstName} {thread.application.candidate.lastName} · {thread.application.vacancy.referenceNumber} · {thread.application.vacancy.title}</p></div><Link href={`/recruitment/applications/${thread.application.id}`} className="text-xs font-bold text-blue-700">Open Candidate 360 →</Link></div><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{thread.messages.slice().reverse().map((message)=><div key={message.id} className={`rounded-xl p-3 text-xs ${message.senderUserId===user.userId?'ml-8 bg-blue-50 text-blue-900':'mr-8 bg-slate-100 text-slate-800'}`}><p>{message.body}</p><p className="mt-1 text-[10px] opacity-60">{formatDateTime(message.sentAt)}</p></div>)}</div><div className="mt-3"><MessageComposer threadId={thread.id}/></div></div>)}{threads.length===0&&<div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No candidate communication threads yet.</div>}</div></div></main><Footer/></div>
}
