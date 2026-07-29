import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, CheckSquare } from 'lucide-react'
import { TaskAction } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function assignedTask(task: {
  taskSnapshotJson?: string | null
  taskTemplate: {
    title: string
    description: string | null
    evidenceRequired: boolean
  }
}) {
  try {
    const snapshot = JSON.parse(task.taskSnapshotJson || 'null')
    if (snapshot && typeof snapshot === 'object') return snapshot as typeof task.taskTemplate
  } catch {}
  return task.taskTemplate
}

export default async function CandidateTasksPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const tasks = pb?.tasks ?? []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Before you start
          </Link>
          <PageIntro
            eyebrow="Before you start"
            title="Additional requests"
            description="Complete any specific action FRAD has assigned that does not belong in a form, document or course."
          />
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No other tasks"
              description="There is nothing else for you to do here."
            />
          ) : (
            <section className="section-panel divide-y divide-stone-200">
              {tasks.map((t) => {
                const task = assignedTask(t)
                const actionable = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'].includes(t.status)
                return (
                  <article id={`task-${t.id}`} key={t.id} className="scroll-mt-24 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-navy-900">{task?.title || 'Task'}</h2>
                        {task?.description && (
                          <p className="mt-2 text-sm leading-6 text-stone-600">{task.description}</p>
                        )}
                        {t.dueAt && (
                          <p className="mt-2 text-xs font-semibold text-stone-500">Due {formatDate(t.dueAt)}</p>
                        )}
                      </div>
                      <span className={`status-chip ${getStatusBadgeClass(t.status)}`}>
                        {t.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>
                    {t.status === 'RETURNED' && t.reviewerComment && (
                      <p role="alert" className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <strong>Changes requested.</strong> {t.reviewerComment}
                      </p>
                    )}
                    {actionable && <TaskAction resourceId={t.id} evidenceRequired={task.evidenceRequired} />}
                    {['SUBMITTED', 'AWAITING_REVIEW'].includes(t.status) && (
                      <p className="mt-4 text-sm text-stone-700">
                        Sent to FRAD for review. You can update it if it is returned.
                      </p>
                    )}
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
