import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, FileText } from 'lucide-react'
import { FormAction, type DynamicFormField } from '@/components/shared/PreboardingActions'

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
              <FileText className="h-5 w-5 text-brand-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Pre-Employment Forms</h1>
            </div>
            {forms.length === 0 ? (
              <p className="text-sm text-slate-500">No forms have been assigned yet.</p>
            ) : (
              forms.map((f) => {
                const configuration = formConfiguration(f)
                return (
                  <div key={f.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{f.formTemplate?.title || 'Form'}</span>
                        {f.formTemplate?.description && (
                          <span className="text-slate-500">{f.formTemplate.description}</span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(f.status)}`}>
                        {f.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {f.returnReason && (
                      <p
                        role="alert"
                        className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"
                      >
                        HR requested changes: {f.returnReason}
                      </p>
                    )}
                    {!['APPROVED', 'WAIVED'].includes(f.status) &&
                      (configuration.fields.length > 0 ? (
                        <FormAction
                          resourceId={f.id}
                          fields={configuration.fields}
                          initialResponses={configuration.responses}
                        />
                      ) : (
                        <p role="alert" className="mt-3 text-red-700">
                          This form is not configured correctly. Contact HR.
                        </p>
                      ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
