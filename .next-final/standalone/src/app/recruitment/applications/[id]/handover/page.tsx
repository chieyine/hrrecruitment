'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { formatDate } from '@/lib/utils'
import { Award, CheckCircle2, ShieldAlert, ArrowLeft, Printer, Lock } from 'lucide-react'

export default function HandoverSummaryPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/recruitment/applications/${params.id}/handover-summary`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load handover summary')
        if (active) setSummary(json.handoverSummary)
      })
      .catch((e) => active && setLoadError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [params.id])

  // Map the summary to the fields the document renders.
  const candidate = {
    legalName: summary?.candidateFullName || '',
    email: summary?.email || '—',
    phone: summary?.primaryPhone || '—',
    address: summary?.address || '—',
    position: summary?.jobTitle || '',
    department: summary?.department || '',
    dutyStation: summary?.dutyStation || '',
    contractType: summary?.contractType || '',
    salary: summary?.salary || '—',
    resumptionDate: summary?.plannedStartDate || null,
    erpPersonnelNumber: summary?.erpPersonnelNumber || '',
  }

  const [erpNumber, setErpNumber] = useState('')
  const [comment, setComment] = useState('')
  const [createdInErpAt, setCreatedInErpAt] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [recordedErp, setRecordedErp] = useState('')
  const [validationMsg, setValidationMsg] = useState('')
  const [actualStartDate, setActualStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [reportingLocation, setReportingLocation] = useState('')
  const [resumptionConfirmed, setResumptionConfirmed] = useState(false)
  const [supervisorConfirmed, setSupervisorConfirmed] = useState(false)
  const [resumptionOutcome, setResumptionOutcome] = useState<'RESUMED'|'DID_NOT_RESUME'|'POSTPONED'|'WITHDRAWN'>('RESUMED')
  const [resumptionComment, setResumptionComment] = useState('')
  const [erpIdempotencyKey] = useState(() => crypto.randomUUID())

  const handleResumption = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/recruitment/applications/${params.id}/resumption`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: resumptionOutcome, actualStartDate: actualStartDate || undefined, reportingLocation: reportingLocation || candidate.dutyStation, supervisorConfirmation: resumptionOutcome === 'RESUMED' ? supervisorConfirmed : false, comment: resumptionComment || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setLoadError(data.error || 'Failed to confirm resumption'); return }
      if (resumptionOutcome === 'RESUMED') setResumptionConfirmed(true)
      else setLoadError('Resumption outcome recorded. ERP transfer remains unavailable.')
    } finally { setSubmitting(false) }
  }

  const handleRecordERP = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationMsg('')
    if (!erpNumber.trim()) {
      setValidationMsg('Please enter the ERP Personnel Number assigned in the FRAD ERP.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/recruitment/applications/${params.id}/erp-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': erpIdempotencyKey },
        body: JSON.stringify({
          erpPersonnelNumber: erpNumber,
          comment,
          createdInErpAt,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setCompleted(true)
        setRecordedErp(data.erpPersonnelNumber)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500 font-semibold">Loading handover summary…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (loadError || !summary) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-rose-700">{loadError || 'Handover summary not found.'}</p>
            <Link href="/recruitment/dashboard" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
              Back to dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center justify-between">
            <Link
              href="/recruitment/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Print Handover Summary
            </button>
          </div>

          {/* Structured Handover Summary Document */}
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  FRAD ERP Manual Handover Summary
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{candidate.legalName}</h1>
                <p className="text-xs text-slate-500">{candidate.position} • {candidate.department}</p>
              </div>
              {summary.preboarding && <div className="space-y-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-1">3. Preboarding and clearance record</h3><div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-xs sm:grid-cols-3"><div>Forms complete: <strong>{summary.preboarding.forms.filter((status: string) => ['APPROVED','WAIVED'].includes(status)).length}/{summary.preboarding.forms.length}</strong></div><div>Documents cleared: <strong>{summary.preboarding.documents.filter((status: string) => ['APPROVED','WAIVED'].includes(status)).length}/{summary.preboarding.documents.length}</strong></div><div>Policies signed: <strong>{summary.preboarding.policies.filter((status: string) => ['SIGNED','APPROVED','WAIVED'].includes(status)).length}/{summary.preboarding.policies.length}</strong></div><div>Courses complete: <strong>{summary.preboarding.courses.filter((status: string) => ['COMPLETED','WAIVED'].includes(status)).length}/{summary.preboarding.courses.length}</strong></div><div>Tasks complete: <strong>{summary.preboarding.tasks.filter((status: string) => ['COMPLETED','APPROVED','WAIVED'].includes(status)).length}/{summary.preboarding.tasks.length}</strong></div><div>Verified profile documents: <strong>{summary.verifiedDocuments.length}</strong></div></div></div>}

              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs space-y-1 text-right">
                <span className="text-emerald-800 font-bold">Clearance Status:</span>
                <span className="block text-sm font-extrabold text-emerald-700">READY TO RESUME</span>
              </div>
            </div>

            {/* Handover Sections Grid */}
            <div className="space-y-6">
              {/* Section 1: Candidate Bio & Position */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
                  1. Candidate & Position Specification
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="block text-slate-400">Full Legal Name</span>
                    <span className="font-bold text-slate-900">{candidate.legalName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Email & Phone</span>
                    <span className="font-bold text-slate-900">{candidate.email} / {candidate.phone}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Duty Station</span>
                    <span className="font-bold text-slate-900">{candidate.dutyStation}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Contract Type & Term</span>
                    <span className="font-bold text-slate-900">{candidate.contractType}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Approved Compensation</span>
                    <span className="font-bold text-emerald-700 font-mono">{candidate.salary}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Resumption Date</span>
                    <span className="font-bold text-slate-900">{formatDate(candidate.resumptionDate)}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Restricted Preboarding Information */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" /> 2. Restricted Payroll & Banking Data for ERP Entry
                </h3>
                <div className="text-xs bg-amber-50/50 p-4 rounded-2xl border border-amber-200 text-slate-600">
                  Payroll and banking details (bank name, account number, NIN) are held in the
                  candidate&apos;s restricted pre-employment forms and are released to authorised
                  payroll staff only. Open the candidate&apos;s secure forms to view them for ERP entry.
                </div>
              </div>
            </div>

            {/* Section 3: Manual ERP Personnel Number Entry */}
            {summary.resumptionOutcome !== 'RESUMED' && !resumptionConfirmed && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900">Record resumption outcome</h2>
                <p className="text-xs text-slate-600">Record what happened on the planned start date. ERP transfer is available only after confirmed resumption.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Outcome<select value={resumptionOutcome} onChange={(event) => setResumptionOutcome(event.target.value as typeof resumptionOutcome)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="RESUMED">Resumed</option><option value="POSTPONED">Start postponed</option><option value="DID_NOT_RESUME">Did not resume</option><option value="WITHDRAWN">Candidate withdrew</option></select></label>
                  <label className="text-xs font-bold text-slate-700">Actual start date<input type="date" value={actualStartDate} onChange={(e) => setActualStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
                  <label className="text-xs font-bold text-slate-700">Reporting location<input value={reportingLocation} onChange={(e) => setReportingLocation(e.target.value)} placeholder={candidate.dutyStation} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
                  <label className="text-xs font-bold text-slate-700 sm:col-span-2">Notes<textarea value={resumptionComment} onChange={(event) => setResumptionComment(event.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
                </div>
                {resumptionOutcome === 'RESUMED' && <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={supervisorConfirmed} onChange={(event) => setSupervisorConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4" />
                  The receiving supervisor has independently confirmed that the candidate actually resumed.
                </label>}
                <button type="button" onClick={handleResumption} disabled={submitting || (resumptionOutcome === 'RESUMED' && !supervisorConfirmed)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">Record outcome</button>
              </div>
            )}

            <div className="rounded-3xl bg-slate-900 p-8 text-white space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldAlert className="h-4 w-4" /> MANUAL ERP ENTRY PROTOCOL
              </div>

              <h2 className="text-xl font-bold">Record ERP Personnel Number</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                After manually creating the official employee record in the FRAD ERP, input the generated ERP Personnel Number below. This action updates the recruitment record to <code className="text-emerald-400 font-bold">TRANSFERRED_TO_ERP</code> and locks the recruitment file.
              </p>

              {completed ? (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold space-y-1">
                  <span className="flex items-center gap-1 text-sm">
                    <CheckCircle2 className="h-5 w-5" /> ERP Transfer Successfully Recorded!
                  </span>
                  <p>ERP Personnel Number: <span className="font-mono text-white text-base">{recordedErp}</span></p>
                  <p className="text-[11px] font-normal text-slate-300">Recruitment & preboarding file has been marked read-only and closed.</p>
                </div>
              ) : (
                <form onSubmit={handleRecordERP} className="space-y-4 text-xs">
                  <label className="block font-bold">Date created in ERP<input required type="date" value={createdInErpAt} onChange={(event) => setCreatedInErpAt(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 p-2 text-white" /></label>
                  {validationMsg && (
                    <p role="alert" className="rounded-lg bg-rose-500/15 border border-rose-400/40 p-2.5 text-rose-200">
                      {validationMsg}
                    </p>
                  )}
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      FRAD ERP Personnel Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={erpNumber}
                      onChange={(e) => setErpNumber(e.target.value)}
                      placeholder="e.g. ERP-EMP-2026-8891"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-mono font-bold text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">HR Handover Comment (Optional)</label>
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Record manual ERP creation confirmation notes..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || (summary.resumptionOutcome !== 'RESUMED' && !resumptionConfirmed)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-6 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50 transition-all w-full"
                  >
                    <Award className="h-4 w-4" />
                    {submitting ? 'Recording Handover...' : 'Mark as Created in ERP'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
