import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, Shield } from 'lucide-react'
import { PolicyAction } from '@/components/shared/PreboardingActions'

export const dynamic = 'force-dynamic'

function assignedPolicyMethod(policy: {
  policySnapshotJson?: string | null
  policyDocument?: { acknowledgementMethod?: string } | null
}) {
  try {
    return (
      JSON.parse(policy.policySnapshotJson || '{}').acknowledgementMethod ||
      policy.policyDocument?.acknowledgementMethod ||
      'TYPED_NAME'
    )
  } catch {
    return policy.policyDocument?.acknowledgementMethod || 'TYPED_NAME'
  }
}

export default async function CandidatePreboardingPoliciesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const policies = pb?.policyAcknowledgements ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Preboarding
          </Link>
          <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Policies &amp; Signatures</h1>
            </div>
            {policies.length === 0 ? (
              <p className="text-sm text-slate-500">No policies have been assigned yet.</p>
            ) : (
              policies.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-900">{p.policyDocument?.title || 'Policy'}</span>
                    <span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(p.status)}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {p.policyDocument?.summary && <p className="mt-2 text-slate-600">{p.policyDocument.summary}</p>}
                  {p.policyDocument?.fileAssetId && (
                    <a
                      href={`/api/assets/download/${p.policyDocument.fileAssetId}`}
                      className="mt-2 inline-block font-bold text-brand-700 hover:underline"
                    >
                      Download policy
                    </a>
                  )}
                  {!['SIGNED', 'APPROVED', 'WAIVED'].includes(p.status) && (
                    <PolicyAction resourceId={p.id} method={assignedPolicyMethod(p)} />
                  )}
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
