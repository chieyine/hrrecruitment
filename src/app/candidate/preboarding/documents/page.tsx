import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, FileUp, ShieldCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ControlledDocumentViewer from '@/components/shared/ControlledDocumentViewer'
import { DocumentAction } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { prisma } from '@/lib/prisma'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CandidatePreboardingDocumentsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const preboarding = await getMyPreboarding(user.userId)
  const documents = preboarding?.documents ?? []
  const assetIds = documents.map((document) => document.fileAssetId).filter((id): id is string => Boolean(id))
  const assets = assetIds.length
    ? await prisma.fileAsset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, originalName: true, mimeType: true },
      })
    : []
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))

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
            title="Documents"
            description="Upload each requested record once. FRAD will retain the submitted version, review outcome and any replacement request."
          />

          <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <p>
              Files are private to your recruitment record. Sensitive documents are restricted to authorised HR
              reviewers.
            </p>
          </div>

          {documents.length === 0 ? (
            <EmptyState
              icon={FileUp}
              title="No documents requested"
              description="Any document FRAD needs before your first day will appear here."
            />
          ) : (
            <div className="space-y-5">
              {documents.map((document) => {
                const requirement = document.documentRequirement
                const asset = document.fileAssetId ? assetById.get(document.fileAssetId) : null
                const locked = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'WAIVED'].includes(document.status)
                return (
                  <article
                    id={`document-${document.id}`}
                    key={document.id}
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white"
                  >
                    <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-start sm:px-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-navy-900">{requirement?.name || 'Document'}</h2>
                          {!document.required && (
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                              Optional
                            </span>
                          )}
                        </div>
                        {requirement?.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{requirement.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-stone-500">
                          {document.dueAt && <span>Due {formatDate(document.dueAt)}</span>}
                          <span>Accepted: {requirement?.allowedFileTypes?.toUpperCase() || 'PDF, JPG or PNG'}</span>
                          {requirement?.expiryRequired && <span>Expiry date required</span>}
                          {document.versionNumber > 1 && <span>Version {document.versionNumber}</span>}
                        </div>
                      </div>
                      <span className={`status-chip ${getStatusBadgeClass(document.status)}`}>
                        {document.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>

                    {document.rejectionReason && ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(document.status) && (
                      <p
                        role="alert"
                        className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-6"
                      >
                        <strong>Replacement requested.</strong> {document.rejectionReason}
                      </p>
                    )}

                    {asset && (
                      <div className="border-t border-stone-200 bg-stone-50 p-4 sm:p-6">
                        {asset.mimeType === 'application/pdf' ? (
                          <ControlledDocumentViewer
                            fileId={asset.id}
                            title={asset.originalName}
                            reference={`Submitted version ${document.versionNumber}`}
                            issuedLabel={
                              document.submittedAt ? `Submitted ${formatDate(document.submittedAt)}` : undefined
                            }
                          />
                        ) : (
                          <div className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
                            <div>
                              <p className="text-sm font-semibold text-navy-900">{asset.originalName}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                Submitted {document.submittedAt ? formatDate(document.submittedAt) : 'for review'}
                                {document.expiryDate ? ` · Expires ${formatDate(document.expiryDate)}` : ''}
                              </p>
                            </div>
                            <a
                              href={`/api/assets/download/${asset.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary"
                            >
                              <ExternalLink className="h-4 w-4" /> Open file
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {!locked && (
                      <div className="border-t border-stone-200 px-5 py-5 sm:px-6">
                        <h3 className="text-sm font-semibold text-navy-900">
                          {asset ? 'Submit a replacement' : 'Upload document'}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          The previous version remains in the audit history when you submit a replacement.
                        </p>
                        <DocumentAction
                          resourceId={document.id}
                          sensitivityClass={requirement?.sensitivityClass}
                          expiryRequired={requirement?.expiryRequired}
                          allowedFileTypes={requirement?.allowedFileTypes}
                        />
                      </div>
                    )}

                    {['APPROVED', 'WAIVED'].includes(document.status) && (
                      <div className="flex items-start gap-3 border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 sm:px-6">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="font-semibold">
                          {document.status === 'WAIVED'
                            ? 'FRAD waived this requirement.'
                            : 'FRAD approved this document.'}
                        </p>
                      </div>
                    )}
                    {['SUBMITTED', 'UNDER_REVIEW'].includes(document.status) && (
                      <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-700 sm:px-6">
                        FRAD is reviewing this version. You can upload a replacement if it is returned to you.
                      </div>
                    )}
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
