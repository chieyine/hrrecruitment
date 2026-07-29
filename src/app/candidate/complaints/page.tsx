import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquareWarning } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { formatDateTime } from '@/lib/utils'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ComplaintReply from './ComplaintReply'

export default async function CandidateComplaintsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const cases = await prisma.complaintCase.findMany({
    where: { reporterUserId: user.userId },
    include: {
      application: { select: { vacancy: { select: { referenceNumber: true, title: true } } } },
      comments: {
        where: { internalOnly: false },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="mx-auto max-w-5xl space-y-7 px-4 sm:px-6 lg:px-8">
          <PageIntro
            eyebrow="Candidate account"
            title="My concerns"
            description="Keep track of a concern, appeal or complaint you have sent to FRAD."
            actions={
              <Link href="/complaints" className="btn-primary">
                Send a new concern
              </Link>
            }
          />

          {cases.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="You have not sent a concern"
              description="Use the concern service if you need FRAD to formally review something about recruitment."
              action={{ href: '/complaints', label: 'Send a concern' }}
            />
          ) : (
            <div className="space-y-4">
              {cases.map((item) => (
                <article key={item.id} className="section-panel">
                  <div className="flex flex-col justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                    <div>
                      <p className="font-mono text-[10px] font-bold text-brand-700">{item.referenceNumber}</p>
                      <h2 className="mt-1 text-base font-semibold text-navy-900">{item.subject}</h2>
                      <p className="mt-1 text-xs text-stone-500">
                        Sent {formatDateTime(item.createdAt)} · {humanLabel(item.category)}
                      </p>
                      {item.application && (
                        <p className="mt-1 text-xs text-stone-500">
                          {item.application.vacancy.referenceNumber} · {item.application.vacancy.title}
                        </p>
                      )}
                    </div>
                    <span className="status-chip border-stone-200 bg-stone-50 text-stone-700">
                      {humanLabel(item.status)}
                    </span>
                  </div>

                  <div className="space-y-3 px-5 py-4 sm:px-6">
                    <div className="rounded-xl bg-stone-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[.1em] text-stone-500">Your submission</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{item.description}</p>
                    </div>

                    {item.resolution && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[.1em] text-emerald-800">Outcome</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-emerald-950">{item.resolution}</p>
                      </div>
                    )}

                    {item.comments.map((comment) => {
                      const mine = comment.authorUserId === user.userId
                      return (
                        <div
                          key={comment.id}
                          className={`rounded-xl p-4 text-sm leading-6 ${
                            mine ? 'ml-8 bg-stone-100 text-stone-800' : 'mr-8 bg-brand-50 text-brand-950'
                          }`}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-[.1em] opacity-70">
                            {mine ? 'You' : 'FRAD case team'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                          <span className="mt-1 block text-[11px] opacity-70">{formatDateTime(comment.createdAt)}</span>
                        </div>
                      )
                    })}
                  </div>

                  {!['RESOLVED', 'CLOSED'].includes(item.status) && <ComplaintReply caseId={item.id} />}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function humanLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}
