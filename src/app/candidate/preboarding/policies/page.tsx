import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ControlledDocumentViewer from '@/components/shared/ControlledDocumentViewer'
import { PolicyAction } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type AssignedPolicy = {
  title: string
  category: string
  version: number
  effectiveDate: string | Date
  summary: string | null
  acknowledgementMethod: string
  fileAssetId: string | null
}

function assignedPolicyDocument(policy: {
  policySnapshotJson?: string | null
  policyDocument?: AssignedPolicy | null
}) {
  try {
    const snapshot = JSON.parse(policy.policySnapshotJson || 'null')
    return snapshot && typeof snapshot === 'object' ? (snapshot as AssignedPolicy) : policy.policyDocument
  } catch {
    return policy.policyDocument
  }
}

function assignedPolicyMethod(document: AssignedPolicy | null | undefined) {
  const method = document?.acknowledgementMethod || 'TYPED_NAME'
  return method === 'SIGNATURE' ? 'TYPED_NAME' : method
}

export default async function CandidatePreboardingPoliciesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const preboarding = await getMyPreboarding(user.userId)
  const policies = preboarding?.policyAcknowledgements ?? []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-6xl space-y-6">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Before you start
          </Link>
          <PageIntro
            eyebrow="Before you start"
            title="Policies to read and sign"
            description="Read the official PDF before recording your acknowledgement. FRAD keeps the policy version and your signature evidence."
          />

          {policies.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No policies assigned"
              description="Policies that apply to your role will appear here."
            />
          ) : (
            <div className="space-y-6">
              {policies.map((policy) => {
                const document = assignedPolicyDocument(policy)
                const complete = ['SIGNED', 'APPROVED', 'WAIVED'].includes(policy.status)
                return (
                  <article
                    id={`policy-${policy.id}`}
                    key={policy.id}
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white"
                  >
                    <div className="flex flex-col justify-between gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                          {document?.category?.replaceAll('_', ' ').toLowerCase() || 'FRAD policy'}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-navy-900">{document?.title || 'Policy'}</h2>
                        <p className="mt-2 text-xs font-semibold text-stone-500">
                          Version {document?.version || 1}
                          {document?.effectiveDate ? ` · Effective ${formatDate(document.effectiveDate)}` : ''}
                          {policy.dueAt ? ` · Due ${formatDate(policy.dueAt)}` : ''}
                        </p>
                        {document?.summary && (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">{document.summary}</p>
                        )}
                      </div>
                      <span className={`status-chip ${getStatusBadgeClass(policy.status)}`}>
                        {policy.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>

                    {document?.fileAssetId ? (
                      <div className="p-4 sm:p-6">
                        <ControlledDocumentViewer
                          fileId={document.fileAssetId}
                          title={document.title}
                          reference={`Policy version ${document.version || 1}`}
                          issuedLabel={
                            document.effectiveDate ? `Effective ${formatDate(document.effectiveDate)}` : undefined
                          }
                        />
                      </div>
                    ) : (
                      <p
                        role="alert"
                        className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:m-6"
                      >
                        The official PDF has not been attached. Ask the recruitment team to provide it before you sign.
                      </p>
                    )}

                    <div className="border-t border-stone-200 bg-stone-50 px-5 py-5 sm:px-6">
                      {complete ? (
                        <div className="flex items-start gap-3 text-sm text-emerald-900">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          <div>
                            <p className="font-semibold">Acknowledgement recorded</p>
                            {policy.signedAt && <p className="mt-1 text-xs">Signed {formatDate(policy.signedAt)}</p>}
                          </div>
                        </div>
                      ) : document?.fileAssetId ? (
                        <div className="max-w-xl">
                          <h3 className="font-semibold text-navy-900">Your acknowledgement</h3>
                          <PolicyAction resourceId={policy.id} method={assignedPolicyMethod(document)} />
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
