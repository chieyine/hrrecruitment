'use client'

import { use, useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react'
import { candidateStatusGuidance, candidateStatusLabel } from '@/lib/candidate-status'
import { ReasonDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toaster'

export default function CandidateApplicationDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/candidate/applications/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.application) setApplication(data.application)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.id])

  const { toast } = useToast()
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const withdraw = async (reason: string) => {
    const response = await fetch(`/api/candidate/applications/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'WITHDRAW', reason }),
    })
    const data = await response.json()
    if (response.ok) {
      setApplication({ ...application, canWithdraw: false, candidateVisibleStatus: 'WITHDRAWN' })
      setConfirmingWithdraw(false)
      toast('success', 'Application withdrawn.')
    } else {
      toast('error', data.error || 'Withdrawal failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/candidate/applications" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Application details</h1>
            <p className="text-slate-600 text-sm">Review its status and next step.</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            Loading application record...
          </div>
        ) : !application ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            Application record not found.
          </div>
        ) : (
          <div className="space-y-6">
            {(() => { const status = application.isDraft ? 'APPLICATION_DRAFT' : application.candidateVisibleStatus; const guidance = candidateStatusGuidance(status); return <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><h3 className="font-bold">{candidateStatusLabel(status)}</h3><p className="mt-1">{guidance.meaning}</p><p className="mt-2">{guidance.action}</p>{!application.isDraft&&<div className="mt-3 flex gap-3 text-xs font-bold"><Link href="/candidate/messages" className="underline">Message recruitment</Link><Link href="/complaints" className="underline">Raise a concern</Link></div>}</div> })()}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">{application.vacancy?.referenceNumber}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{application.vacancy?.title}</h2>
                <p className="text-slate-600 text-sm">{application.vacancy?.department?.name} • {application.vacancy?.dutyStation?.name}</p>
              </div>
              <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                {candidateStatusLabel(application.isDraft ? 'APPLICATION_DRAFT' : application.candidateVisibleStatus)}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Progress</h3>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 rounded-lg p-3 text-sm ${application.isDraft?'bg-amber-50 text-amber-900':'bg-emerald-50 text-emerald-800'}`}>
                  {application.isDraft?<Clock className="h-5 w-5 text-amber-600"/>:<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {application.isDraft
                    ? `Draft saved on ${new Date(application.updatedAt).toLocaleDateString()}`
                    : `Application received on ${new Date(application.submittedAt).toLocaleDateString()}`}
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-slate-700 text-sm">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  Review and shortlisting
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-slate-700 text-sm">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Assessment and interview
                </div>
              </div>
            </div>
            {application.isDraft && <Link href={`/candidate/applications/apply?vacancyId=${application.vacancy.id}`} className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">Continue application</Link>}
            {application.canWithdraw && <button onClick={() => setConfirmingWithdraw(true)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Withdraw application</button>}
          </div>
        )}
      </main>
      <Footer />

      <ReasonDialog
        open={confirmingWithdraw}
        onClose={() => setConfirmingWithdraw(false)}
        onConfirm={(reason) => withdraw(reason)}
        title="Withdraw application"
        description="Withdrawing removes you from further consideration for this vacancy. This cannot be undone."
        confirmLabel="Withdraw"
        reasonLabel="Reason for withdrawing"
        reasonRequired
        tone="danger"
      />
    </div>
  )
}
