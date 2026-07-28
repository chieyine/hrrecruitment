import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Mail } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import MessageComposer from '@/components/shared/MessageComposer'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'

export default async function CommunicationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'application.read.all'))) redirect('/recruitment/dashboard')
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
  const delivery = [
    {
      label: 'Waiting to send',
      value: (statusCounts.PENDING || 0) + (statusCounts.PROCESSING || 0),
      detail: 'Queued or sending now',
      icon: Clock3,
      tone: 'text-stone-600',
    },
    {
      label: 'Delivered',
      value: statusCounts.DELIVERED || 0,
      detail: 'Accepted for delivery',
      icon: CheckCircle2,
      tone: 'text-emerald-700',
    },
    {
      label: 'Retrying',
      value: statusCounts.FAILED || 0,
      detail: 'Another attempt is due',
      icon: Mail,
      tone: 'text-amber-700',
    },
    {
      label: 'Needs attention',
      value: statusCounts.DEAD_LETTER || 0,
      detail: 'Stopped after repeated failures',
      icon: CircleAlert,
      tone: 'text-rose-700',
    },
  ]
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-8">
          <PageIntro
            title="Candidate messages"
            description="Read and reply to messages about an application. Check delivery here when a candidate says an email did not arrive."
          />

          <section aria-labelledby="delivery-heading" className="section-panel">
            <div className="section-heading">
              <div>
                <h2 id="delivery-heading" className="text-lg font-semibold text-navy-900">
                  Email delivery
                </h2>
                <p className="mt-1 text-sm text-stone-600">Messages waiting, delivered or needing attention.</p>
              </div>
            </div>
            <div className="grid divide-y divide-stone-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              {delivery.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{item.label}</p>
                      <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon aria-hidden className={`h-4 w-4 ${item.tone}`} />
                      <span className="font-display text-3xl leading-none text-navy-950">{item.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="conversations-heading" className="space-y-4">
            <div className="flex items-end justify-between border-b border-stone-300 pb-3">
              <div>
                <h2 id="conversations-heading" className="text-xl font-semibold text-navy-950">
                  Conversations
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {threads.length === 1 ? '1 application thread' : `${threads.length} application threads`}
                </p>
              </div>
            </div>
            {threads.map((thread) => (
              <article key={thread.id} className="paper-panel overflow-hidden">
                <div className="flex flex-col justify-between gap-4 border-b border-stone-200 px-5 py-4 md:flex-row md:items-start sm:px-6">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="status-chip border-brand-200 bg-brand-50 text-brand-800">
                        {thread.category.replaceAll('_', ' ').toLowerCase()}
                      </span>
                      {thread.restricted && (
                        <span className="status-chip border-rose-200 bg-rose-50 text-rose-800">HR access only</span>
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-navy-950">{thread.subject}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {thread.application.candidate.legalFirstName} {thread.application.candidate.lastName} ·{' '}
                      {thread.application.vacancy.referenceNumber} · {thread.application.vacancy.title}
                    </p>
                  </div>
                  <Link
                    href={`/recruitment/applications/${thread.application.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
                  >
                    Open application
                    <ArrowUpRight aria-hidden className="h-4 w-4" />
                  </Link>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto bg-stone-50/70 px-5 py-5 sm:px-6">
                  {thread.messages
                    .slice()
                    .reverse()
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[88%] rounded-xl border px-4 py-3 text-sm leading-6 shadow-sm ${
                          message.senderUserId === user.userId
                            ? 'ml-auto border-brand-200 bg-brand-50 text-brand-950'
                            : 'mr-auto border-stone-200 bg-white text-stone-800'
                        }`}
                      >
                        <p>{message.body}</p>
                        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide opacity-55">
                          {formatDateTime(message.sentAt)}
                        </p>
                      </div>
                    ))}
                </div>
                <div className="border-t border-stone-200 px-5 py-5 sm:px-6">
                  <MessageComposer threadId={thread.id} />
                </div>
              </article>
            ))}
            {threads.length === 0 && (
              <div className="empty-state">
                <Mail aria-hidden className="mx-auto h-6 w-6 text-brand-700" />
                <h2 className="mt-3 font-semibold text-navy-950">No messages yet</h2>
                <p className="mt-1 text-sm text-stone-600">
                  A conversation will appear here when a candidate or recruitment team member sends a message.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
