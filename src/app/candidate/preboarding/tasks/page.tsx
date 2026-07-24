import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, CheckSquare } from 'lucide-react'
import { TaskAction } from '@/components/shared/PreboardingActions'

export const dynamic = 'force-dynamic'

export default async function CandidateTasksPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const tasks = pb?.tasks ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/candidate/preboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Preboarding
          </Link>
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Tasks to complete before you start</h1>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks have been assigned yet.</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-4"><span className="font-bold text-slate-900">{t.taskTemplate?.title || 'Task'}</span><span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(t.status)}`}>{t.status.replace(/_/g, ' ')}</span></div>
                  {t.taskTemplate?.description && <p className="mt-2 text-slate-600">{t.taskTemplate.description}</p>}
                  {!['COMPLETED', 'APPROVED', 'WAIVED'].includes(t.status) && <TaskAction resourceId={t.id} evidenceRequired={t.taskTemplate.evidenceRequired} />}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
