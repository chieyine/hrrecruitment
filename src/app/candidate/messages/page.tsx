import { redirect } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import MessageComposer from '@/components/shared/MessageComposer'
import Link from 'next/link'
import { homeRouteForRoles } from '@/lib/home-route'

export const dynamic = 'force-dynamic'

export default async function CandidateMessagesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))

  const [threads, applications] = await Promise.all([
    prisma.messageThread.findMany({
      where: { application: { candidate: { userId: user.userId } }, restricted: false },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
        application: { select: { vacancy: { select: { referenceNumber: true, title: true } } } },
      },
    }),
    prisma.application.findMany({
      where: { candidate: { userId: user.userId } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, vacancy: { select: { referenceNumber: true, title: true } } },
    }),
  ])
  const threadIds = threads.map((thread) => thread.id)
  if (threadIds.length) {
    await prisma.message.updateMany({
      where: {
        messageThreadId: { in: threadIds },
        senderUserId: { not: user.userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })
  }
  const fileIds = threads.flatMap((thread) =>
    thread.messages.flatMap((message) => (message.fileAssetId ? [message.fileAssetId] : []))
  )
  const fileAssets = fileIds.length
    ? await prisma.fileAsset.findMany({
        where: { id: { in: fileIds }, virusScanStatus: 'CLEAN' },
        select: { id: true, originalName: true },
      })
    : []
  const filesById = new Map(fileAssets.map((file) => [file.id, file]))
  const orderedThreads = [...threads].sort((left, right) => {
    const leftTime = left.messages.at(-1)?.sentAt.getTime() ?? 0
    const rightTime = right.messages.at(-1)?.sentAt.getTime() ?? 0
    return rightTime - leftTime || left.id.localeCompare(right.id)
  })
  const applicationOptions = applications.map((application) => ({
    id: application.id,
    label: `${application.vacancy.referenceNumber} · ${application.vacancy.title}`,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow="Candidate account"
            title="Messages"
            description="Questions and updates between you and the FRAD recruitment team."
          />

          <section className="section-panel">
            <details open={threads.length === 0}>
              <summary className="cursor-pointer list-none px-5 py-5 sm:px-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <MessageSquareText className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-navy-900">Start a message</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Ask about an application, deadline, interview or another recruitment step.
                </p>
              </summary>
              <div className="border-t border-stone-200 px-5 py-5 sm:px-6">
                <div className="mt-5 max-w-2xl">
                  <MessageComposer applications={applicationOptions} />
                </div>
              </div>
            </details>
          </section>

          {orderedThreads.length > 0 && (
            <div className="space-y-5">
              {orderedThreads.map((thread) => (
                <section key={thread.id} aria-labelledby={`thread-${thread.id}`} className="section-panel">
                  <div className="section-heading">
                    <div>
                      <h2 id={`thread-${thread.id}`} className="text-lg font-semibold text-navy-900">
                        {thread.subject}
                      </h2>
                      <p className="mt-1 text-sm text-stone-600">
                        {thread.application.vacancy.referenceNumber} · {thread.application.vacancy.title} ·{' '}
                        {thread.messages.length} {thread.messages.length === 1 ? 'message' : 'messages'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-stone-50/60 px-5 py-5 sm:px-6">
                    {thread.messages.length === 0 ? (
                      <p className="text-sm text-stone-500">No messages in this conversation yet.</p>
                    ) : (
                      thread.messages.map((message) => {
                        const mine = message.senderUserId === user.userId
                        return (
                          <article
                            key={message.id}
                            className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                              mine
                                ? 'ml-auto rounded-br-sm bg-brand-800 text-white'
                                : 'rounded-bl-sm border border-stone-200 bg-white text-navy-900 shadow-sm'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold uppercase tracking-[.1em] ${mine ? 'text-brand-200' : 'text-stone-500'}`}
                            >
                              {mine ? 'You' : 'FRAD recruitment'}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                            {message.fileAssetId && filesById.has(message.fileAssetId) && (
                              <a
                                href={`/api/assets/download/${message.fileAssetId}`}
                                className={`mt-2 block text-xs font-semibold underline ${
                                  mine ? 'text-brand-100' : 'text-brand-800'
                                }`}
                              >
                                {filesById.get(message.fileAssetId)!.originalName}
                              </a>
                            )}
                            <time className={`mt-2 block text-[10px] ${mine ? 'text-brand-200' : 'text-stone-500'}`}>
                              {formatDateTime(message.sentAt)}
                            </time>
                          </article>
                        )
                      })
                    )}
                  </div>

                  <div className="border-t border-stone-200 px-5 py-5 sm:px-6">
                    <MessageComposer threadId={thread.id} />
                  </div>
                </section>
              ))}
            </div>
          )}

          <p className="text-xs leading-5 text-stone-600">
            Messages are for routine recruitment questions. For a formal concern, use the{' '}
            <Link href="/complaints" className="font-semibold text-brand-800 underline">
              concern service
            </Link>
            . Report impersonation or payment requests through the{' '}
            <Link href="/report-fraud" className="font-semibold text-brand-800 underline">
              fraud form
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
