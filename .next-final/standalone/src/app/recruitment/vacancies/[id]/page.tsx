'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Users, CheckCircle, PauseCircle, XCircle, Download, Edit } from 'lucide-react'
import { ReasonDialog } from '@/components/ui/Dialog'

export default function VacancyDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const [vacancy, setVacancy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = useCallback(() => {
    fetch(`/api/recruitment/vacancies/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.vacancy) setVacancy(data.vacancy)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const handleAction = async (action: string, reason = '') => {
    if (['CANCEL', 'APPROVE'].includes(action) && !reason && pendingAction !== action) {
      setPendingAction(action)
      return
    }
    try {
      const response = await fetch(`/api/recruitment/vacancies/${params.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const data = await response.json()
      setMessage(response.ok ? 'Vacancy action completed.' : data.error || 'Action failed.')
      setPendingAction(null)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/recruitment/vacancies" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vacancy Workspace</h1>
              <p className="text-slate-600 text-sm">Specification, approvals, applicant pipeline, and accountable work in one place.</p>
            </div>
          </div>
          {vacancy && (
            <div className="flex flex-wrap items-center gap-2">
              {vacancy.capabilities?.exportDocumentation && <a href={`/api/recruitment/vacancies/${params.id}/documentation`} className="btn-secondary"><Download className="h-4 w-4" />Export vacancy file</a>}
              <Link
                href={`/recruitment/vacancies/${params.id}/applications`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> View Applicants ({vacancy.applications?.length || 0})
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            Loading vacancy specification...
          </div>
        ) : !vacancy ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            Vacancy record not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Submitted', vacancy.applications?.filter((application: any) => ['SUBMITTED', 'UNDER_REVIEW'].includes(application.internalStatus)).length || 0],
                  ['Shortlisted', vacancy.applications?.filter((application: any) => ['SHORTLISTED', 'ASSESSMENT_INVITED', 'ASSESSMENT_COMPLETED'].includes(application.internalStatus)).length || 0],
                  ['Interview', vacancy.applications?.filter((application: any) => ['INTERVIEW_INVITED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'].includes(application.internalStatus)).length || 0],
                  ['Offer / hire', vacancy.applications?.filter((application: any) => ['OFFER_DRAFT', 'OFFER_SENT', 'OFFER_ACCEPTED', 'PREBOARDING', 'READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)).length || 0],
                ].map(([label, value]) => <Link key={String(label)} href={`/recruitment/vacancies/${params.id}/applications`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></Link>)}
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{vacancy.referenceNumber}</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">{vacancy.title}</h2>
                <p className="text-slate-600 text-sm mt-1">{vacancy.department?.name} • {vacancy.dutyStation?.name}</p>

                <div className="mt-6 border-t border-slate-100 pt-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Job Summary</h3>
                    <p className="text-slate-600 text-sm mt-1">{vacancy.summary}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Responsibilities</h3>
                    <pre className="text-slate-600 text-sm mt-1 whitespace-pre-wrap font-sans">{vacancy.responsibilities}</pre>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Essential Qualifications</h3>
                    <p className="text-slate-600 text-sm mt-1">{vacancy.essentialQualifications}</p>
                  </div>
                </div>
                {vacancy.questions?.length > 0 && <div className="mt-6 border-t border-slate-100 pt-4"><h3 className="font-semibold text-slate-900 text-sm">Application questions</h3><ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{vacancy.questions.map((q: any) => <li key={q.id}>{q.label}{q.required ? ' *' : ''}</li>)}</ul></div>}
                {vacancy.requiredDocuments?.length > 0 && <div className="mt-4"><h3 className="font-semibold text-slate-900 text-sm">Required documents</h3><ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{vacancy.requiredDocuments.map((d: any) => <li key={d.id}>{d.documentType}{d.required ? ' *' : ''}</li>)}</ul></div>}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 text-base mb-4">Vacancy Control Panel</h3>
                {message && <p role="status" className="mb-3 rounded-lg bg-slate-100 p-2 text-xs text-slate-700">{message}</p>}
                <div className="space-y-3">
                  <Link href={`/recruitment/work?scope=team`} className="block w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-sm font-semibold text-blue-700">View accountable work</Link>
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-slate-600">Current Status</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full text-xs">
                      {vacancy.status}
                    </span>
                  </div>

                  <Link
                    href={`/recruitment/vacancies/${params.id}/edit`}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit Vacancy
                  </Link>

                  <button
                    onClick={() => handleAction(vacancy.status === 'DRAFT' ? 'SUBMIT_APPROVAL' : ['APPROVED','APPROVED_WITH_CONDITIONS'].includes(vacancy.approvalStatus) ? 'PUBLISH' : 'APPROVE')}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> {vacancy.status === 'DRAFT' ? 'Submit for approval' : ['APPROVED','APPROVED_WITH_CONDITIONS'].includes(vacancy.approvalStatus) ? 'Publish approved vacancy' : 'Approve vacancy'}
                  </button>

                  <button
                    onClick={() => handleAction(vacancy.status === 'PAUSED' ? 'RESUME' : 'PAUSE')}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <PauseCircle className="w-4 h-4" /> {vacancy.status === 'PAUSED' ? 'Resume applications' : 'Pause applications'}
                  </button>

                  <button
                    onClick={() => handleAction('CLOSE')}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Close Vacancy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />

      <ReasonDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={(reason) => { if (pendingAction) return handleAction(pendingAction, reason || ' ') }}
        title={pendingAction === 'CANCEL' ? 'Cancel vacancy' : 'Approve vacancy'}
        description={pendingAction === 'CANCEL' ? 'A reason is required to cancel; active applications are closed out.' : 'Optionally record a decision note for the approval audit trail.'}
        confirmLabel={pendingAction === 'CANCEL' ? 'Cancel vacancy' : 'Approve'}
        reasonRequired={pendingAction === 'CANCEL'}
        tone={pendingAction === 'CANCEL' ? 'danger' : 'default'}
      />
    </div>
  )
}
