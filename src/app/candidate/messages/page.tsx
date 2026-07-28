import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import MessageComposer from '@/components/shared/MessageComposer'

export const dynamic = 'force-dynamic'

export default async function CandidateMessagesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const threads = await prisma.messageThread.findMany({
    where: { application: { candidate: { userId: user.userId } }, restricted: false },
    include: { messages: { orderBy: { sentAt: 'desc' } } },
  })

  // The candidate's most recent application anchors a new message thread.
  const latestApp = await prisma.application.findFirst({
    where: { candidate: { userId: user.userId } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Messages</h1>
            </div>

            {threads.length === 0 ? (
              <p className="text-sm text-slate-500">
                You have no messages yet. HR will contact you here when there is an update.
              </p>
            ) : (
              <div className="space-y-4">
                {threads.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">{t.subject}</h3>
                    {t.messages.length === 0 ? (
                      <p className="text-xs text-slate-400">No messages in this thread yet.</p>
                    ) : (
                      t.messages.map((m) => (
                        <div
                          key={m.id}
                          className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 text-xs"
                        >
                          <p>{m.body}</p>
                          <p className="text-[10px] text-brand-500 mt-1">{formatDateTime(m.sentAt)}</p>
                        </div>
                      ))
                    )}
                    <MessageComposer threadId={t.id} />
                  </div>
                ))}
              </div>
            )}

            {threads.length === 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Send a message to HR</h3>
                <MessageComposer applicationId={latestApp?.id} />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
