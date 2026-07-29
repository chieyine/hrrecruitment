import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, FileText } from 'lucide-react'
import { FormAction, type DynamicFormField } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

export const dynamic = 'force-dynamic'

function formConfiguration(form: {
  templateSnapshotJson?: string | null
  responseJson?: string | null
  formTemplate?: { schemaJson?: string | null } | null
}) {
  let fields: DynamicFormField[] = []
  let responses: Record<string, unknown> = {}
  try {
    const snapshot = form.templateSnapshotJson ? JSON.parse(form.templateSnapshotJson) : null
    const schema = snapshot?.schemaJson
      ? JSON.parse(snapshot.schemaJson)
      : JSON.parse(form.formTemplate?.schemaJson || '{"fields":[]}')
    if (Array.isArray(schema.fields)) fields = schema.fields
  } catch {}
  try {
    const parsed = form.responseJson ? JSON.parse(form.responseJson) : {}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) responses = parsed
  } catch {}
  return { fields, responses }
}

export default async function CandidatePreboardingFormsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const forms = pb?.forms ?? []

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
            title="Forms"
            description="Complete the requested information. Draft answers save automatically until you submit."
          />
          {forms.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No forms assigned"
              description="Any form FRAD needs before your first day will appear here."
            />
          ) : (
            <div className="space-y-5">
              {forms.map((f) => {
                const configuration = formConfiguration(f)
                return (
                  <article id={`form-${f.id}`} key={f.id} className="section-panel scroll-mt-24 overflow-hidden">
                    <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-5 sm:px-6">
                      <div>
                        <h2 className="text-lg font-semibold text-navy-900">{f.formTemplate?.title || 'Form'}</h2>
                        {f.formTemplate?.description && (
                          <p className="mt-2 text-sm leading-6 text-stone-600">{f.formTemplate.description}</p>
                        )}
                        {f.dueAt && (
                          <p className="mt-2 text-xs font-semibold text-stone-500">Due {formatDate(f.dueAt)}</p>
                        )}
                      </div>
                      <span className={`status-chip ${getStatusBadgeClass(f.status)}`}>
                        {f.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>
                    {f.returnReason && f.status === 'RETURNED' && (
                      <p
                        role="alert"
                        className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-6"
                      >
                        <strong>Changes requested.</strong> {f.returnReason}
                      </p>
                    )}
                    <div className="px-5 py-5 sm:px-6">
                      {['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'].includes(f.status) &&
                        (configuration.fields.length > 0 ? (
                          <FormAction
                            resourceId={f.id}
                            fields={configuration.fields}
                            initialResponses={configuration.responses}
                          />
                        ) : (
                          <p role="alert" className="text-sm text-rose-700">
                            This form is missing its questions. Ask the recruitment team for help.
                          </p>
                        ))}
                      {['APPROVED', 'WAIVED'].includes(f.status) && (
                        <p className="text-sm font-semibold text-emerald-800">No further action is needed.</p>
                      )}
                      {['SUBMITTED', 'UNDER_REVIEW'].includes(f.status) && (
                        <p className="text-sm text-stone-700">
                          Sent to FRAD for review. You can make changes if the form is returned to you.
                        </p>
                      )}
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
