import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, Upload } from 'lucide-react'
import { DocumentAction } from '@/components/shared/PreboardingActions'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CandidatePreboardingDocumentsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const docs = pb?.documents ?? []

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
              <Upload className="h-5 w-5 text-purple-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Required Documents</h1>
            </div>
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500">No document requirements have been assigned yet.</p>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-4"><span className="font-bold text-slate-900">{d.documentRequirement?.name || 'Document'} {!d.required && <span className="font-normal text-slate-500">(optional)</span>}</span><span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(d.status)}`}>{d.status.replace(/_/g, ' ')}</span></div>
                  {d.dueAt && <p className="mt-2 text-slate-600">Due {formatDate(d.dueAt)}</p>}
                  {d.rejectionReason && <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">HR requested a replacement: {d.rejectionReason}</p>}
                  {!['APPROVED', 'WAIVED'].includes(d.status) && <DocumentAction resourceId={d.id} sensitivityClass={d.documentRequirement?.sensitivityClass} expiryRequired={d.documentRequirement?.expiryRequired} allowedFileTypes={d.documentRequirement?.allowedFileTypes} />}
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
