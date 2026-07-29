import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, MessageSquareText } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { getCandidateTasks } from '@/lib/candidate-tasks'
import { formatDateTime } from '@/lib/utils'
import { homeRouteForRoles } from '@/lib/home-route'

export default async function CandidateTasksPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))

  const now = new Date()
  const items = await getCandidateTasks(user.userId)
  const overdue = items.filter((item) => item.dueAt && item.dueAt < now).length

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow="Candidate account"
            title="To do"
            description={
              items.length
                ? `${items.length} ${items.length === 1 ? 'item needs' : 'items need'} your attention. The most urgent item is first.`
                : 'Anything you need to complete or confirm will appear here.'
            }
            actions={
              <Link href="/candidate/messages" className="btn-secondary">
                <MessageSquareText className="h-4 w-4" />
                Ask for help
              </Link>
            }
          />

          {overdue > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p>
                <strong>
                  {overdue} overdue {overdue === 1 ? 'item' : 'items'}.
                </strong>{' '}
                If you need more time or an adjustment, send the recruitment team a message.
              </p>
            </div>
          )}

          <section aria-label="Items to complete" className="section-panel">
            {items.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-navy-900">You are up to date</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  There is nothing for you to complete right now. We will add new items here and let you know.
                </p>
                <Link href="/candidate/applications" className="btn-secondary mt-5">
                  View applications
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {items.map((item, index) => {
                  const isOverdue = Boolean(item.dueAt && item.dueAt < now)
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="group grid gap-4 px-5 py-5 transition hover:bg-stone-50 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700'
                            : index === 0
                              ? 'bg-brand-700 text-white'
                              : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-navy-900">{item.title}</p>
                          {isOverdue && (
                            <span className="status-chip border-rose-200 bg-rose-50 text-rose-700">Overdue</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {item.kind} · {item.context}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className={`text-xs font-semibold ${isOverdue ? 'text-rose-700' : 'text-stone-600'}`}>
                          <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                          {item.dueAt ? formatDateTime(item.dueAt) : 'No deadline'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <p className="text-sm text-stone-600">
            Need an interview or assessment adjustment?{' '}
            <Link href="/candidate/accommodations" className="font-semibold text-brand-800 hover:underline">
              Tell us what would help
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
