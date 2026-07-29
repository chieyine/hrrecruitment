import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Download, Mail, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import MessageComposer from '@/components/shared/MessageComposer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

type SearchValues = {
  applicationId?: string
  q?: string
}

export default async function CommunicationsPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?returnTo=/recruitment/communications')
  if (!canRunRecruitmentOperations(user.roles)) redirect('/recruitment/dashboard')
  if (!(await hasPermission(user.userId, 'application.read.all'))) redirect('/recruitment/dashboard')

  const query = await searchParams
  const applicationId = query.applicationId?.trim().slice(0, 200) || ''
  const search = query.q?.trim().slice(0, 200) || ''
  const canReadRestricted = await hasPermission(user.userId, 'preboarding.restricted.read')
  const where = {
    ...(applicationId ? { applicationId } : {}),
    ...(!canReadRestricted ? { restricted: false } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: 'insensitive' as const } },
            {
              application: {
                candidate: {
                  OR: [
                    { legalFirstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
            {
              application: {
                vacancy: {
                  OR: [
                    { referenceNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }

  const [rawThreads, outboxHealth, selectedApplication] = await Promise.all([
    prisma.messageThread.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            candidate: {
              select: {
                legalFirstName: true,
                lastName: true,
                userId: true,
              },
            },
            vacancy: { select: { referenceNumber: true, title: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 20,
          select: {
            id: true,
            body: true,
            sentAt: true,
            readAt: true,
            senderUserId: true,
            fileAssetId: true,
            sender: { select: { email: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      take: 100,
    }),
    prisma.outboxMessage.groupBy({
      by: ['status'],
      where: { applicationId: applicationId || { not: null } },
      _count: true,
    }),
    applicationId
      ? prisma.application.findUnique({
          where: { id: applicationId, internalStatus: { not: 'DRAFT' } },
          select: {
            id: true,
            referenceNumber: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { referenceNumber: true, title: true } },
          },
        })
      : Promise.resolve(null),
  ])

  const threads = rawThreads.sort((left, right) => {
    const leftDate = left.messages[0]?.sentAt?.getTime() || 0
    const rightDate = right.messages[0]?.sentAt?.getTime() || 0
    return rightDate - leftDate
  })
  const attachmentIds = threads.flatMap((thread) =>
    thread.messages.flatMap((message) => (message.fileAssetId ? [message.fileAssetId] : []))
  )
  const attachments = attachmentIds.length
    ? await prisma.fileAsset.findMany({
        where: { id: { in: attachmentIds } },
        select: { id: true, originalName: true },
      })
    : []
  const attachmentById = new Map(attachments.map((file) => [file.id, file.originalName]))
  const statusCounts = Object.fromEntries(outboxHealth.map((item) => [item.status, item._count]))
  const delivery = [
    {
      label: 'Waiting',
      value: (statusCounts.PENDING || 0) + (statusCounts.PROCESSING || 0),
      detail: 'Queued or sending',
      icon: Clock3,
      tone: 'text-stone-600',
    },
    {
      label: 'Sent',
      value: statusCounts.DELIVERED || 0,
      detail: 'Handed to the email service',
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
      detail: 'Repeated delivery failure',
      icon: CircleAlert,
      tone: 'text-red-700',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-7">
          {selectedApplication ? (
            <Link
              href={`/recruitment/applications/${selectedApplication.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Application
            </Link>
          ) : null}

          <header className="border-b border-stone-300 pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Candidate messages</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Read and reply in the application record. Email delivery status is shown separately below.
            </p>
            {selectedApplication && (
              <p className="mt-3 text-sm font-medium text-stone-800">
                {selectedApplication.candidate.legalFirstName} {selectedApplication.candidate.lastName} ·{' '}
                {selectedApplication.vacancy.referenceNumber} · {selectedApplication.vacancy.title}
              </p>
            )}
          </header>

          <form className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row">
            {applicationId && <input type="hidden" name="applicationId" value={applicationId} />}
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search messages</span>
              <input
                name="q"
                type="search"
                defaultValue={search}
                placeholder="Candidate, vacancy reference or subject"
                className="field-control"
              />
            </label>
            <button className="btn-primary">
              <Search className="h-4 w-4" />
              Search
            </button>
            {(search || applicationId) && (
              <Link href="/recruitment/communications" className="btn-secondary">
                All messages
              </Link>
            )}
          </form>

          <section
            aria-labelledby="delivery-heading"
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="border-b border-stone-200 px-5 py-4">
              <h2 id="delivery-heading" className="text-lg font-semibold text-stone-950">
                Email delivery
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {applicationId ? 'For this application.' : 'For application-linked recruitment emails.'}
              </p>
            </div>
            <div className="grid divide-y divide-stone-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              {delivery.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{item.label}</p>
                      <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon aria-hidden className={`h-4 w-4 ${item.tone}`} />
                      <span className="text-2xl font-semibold text-stone-950">{item.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {selectedApplication && threads.length === 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">Send the first message</h2>
              <p className="mt-1 text-sm text-stone-600">The reply will be saved against this application.</p>
              <div className="mt-4">
                <MessageComposer applicationId={selectedApplication.id} />
              </div>
            </section>
          )}

          <section aria-labelledby="conversations-heading" className="space-y-4">
            <div className="flex items-end justify-between border-b border-stone-300 pb-3">
              <div>
                <h2 id="conversations-heading" className="text-xl font-semibold text-stone-950">
                  Conversations
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {threads.length === 1 ? '1 thread' : `${threads.length} threads`}
                  {rawThreads.length === 100 ? ' · narrow the search to find older threads' : ''}
                </p>
              </div>
            </div>

            {threads.map((thread) => (
              <article
                key={thread.id}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-stone-200 px-5 py-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="status-chip border-brand-200 bg-brand-50 text-brand-800">
                        {thread.category.replaceAll('_', ' ').toLowerCase()}
                      </span>
                      {thread.restricted && (
                        <span className="status-chip border-red-200 bg-red-50 text-red-800">Restricted HR</span>
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-stone-950">{thread.subject}</h3>
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

                <div className="max-h-[32rem] space-y-3 overflow-y-auto bg-stone-50/70 px-5 py-5">
                  {thread._count.messages > thread.messages.length && (
                    <p className="text-center text-xs text-stone-500">
                      Showing the latest {thread.messages.length} of {thread._count.messages} messages.
                    </p>
                  )}
                  {thread.messages
                    .slice()
                    .reverse()
                    .map((message) => {
                      const fromCandidate = message.senderUserId === thread.application.candidate.userId
                      return (
                        <div
                          key={message.id}
                          className={`max-w-[88%] rounded-xl border px-4 py-3 text-sm leading-6 shadow-sm ${
                            fromCandidate
                              ? 'mr-auto border-stone-200 bg-white text-stone-800'
                              : 'ml-auto border-brand-200 bg-brand-50 text-brand-950'
                          }`}
                        >
                          <p className="text-xs font-semibold text-stone-500">
                            {fromCandidate ? 'Candidate' : message.sender?.email || 'FRAD recruitment'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                          {message.fileAssetId && attachmentById.has(message.fileAssetId) && (
                            <a
                              href={`/api/assets/download/${message.fileAssetId}`}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {attachmentById.get(message.fileAssetId)}
                            </a>
                          )}
                          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide opacity-55">
                            {formatDateTime(message.sentAt)}
                            {message.readAt ? ' · read' : ''}
                          </p>
                        </div>
                      )
                    })}
                </div>
                <div className="border-t border-stone-200 px-5 py-5">
                  <MessageComposer threadId={thread.id} />
                </div>
              </article>
            ))}

            {threads.length === 0 && !selectedApplication && (
              <div className="empty-state">
                <Mail aria-hidden className="mx-auto h-6 w-6 text-brand-700" />
                <h2 className="mt-3 font-semibold text-stone-950">
                  {search ? 'No matching conversations' : 'No messages yet'}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {search
                    ? 'Try a candidate name, vacancy reference or message subject.'
                    : 'Messages will appear here when a candidate or the recruitment team writes.'}
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
