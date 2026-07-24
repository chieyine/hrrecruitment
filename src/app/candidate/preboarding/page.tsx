'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { CheckCircle2, FileText, Upload, Shield, BookOpen, MapPin } from 'lucide-react'

const EMPTY = { id: '', overallCompletionPercentage: 0, readinessStatus: 'NOT_STARTED', confirmedStartDate: null, proposedStartDate: null, reportingLocation: '', forms: [], documents: [], policies: [], courses: [] }

export default function CandidatePreboardingPage() {
  const [preboarding, setPreboarding] = useState<any>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [notice, setNotice] = useState('')
  const groupComplete = (items: any[], complete: string[]) => items.length > 0 && items.every((item) => complete.includes(item.status))

  useEffect(() => {
    fetch('/api/candidate/preboarding')
      .then(async (res) => {
        const json = await res.json()
        const p = json.preboarding
        if (p) {
          setPreboarding({
            id: p.id,
            overallCompletionPercentage: p.overallCompletionPercentage ?? 0,
            readinessStatus: p.readinessStatus,
            confirmedStartDate: p.confirmedStartDate,
            proposedStartDate: p.application?.offers?.[0]?.startDate,
            reportingLocation: [p.application?.vacancy?.dutyStation?.name, p.application?.vacancy?.dutyStation?.address].filter(Boolean).join(' — '),
            forms: (p.forms || []).map((f: any) => ({ id: f.id, title: f.formTemplate?.title || 'Form', status: f.status })),
            documents: (p.documents || []).map((d: any) => ({ id: d.id, name: d.documentRequirement?.name || 'Document', status: d.status })),
            policies: (p.policyAcknowledgements || []).map((x: any) => ({ id: x.id, title: x.policyDocument?.title || 'Policy', status: x.status })),
            courses: (p.courses || []).map((c: any) => ({ id: c.id, title: c.course?.title || 'Course', status: c.status, score: c.score != null ? `${c.score}%` : '—' })),
          })
          setStartDate((p.confirmedStartDate || p.application?.offers?.[0]?.startDate || '').slice(0, 10))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const confirmStartDate = async () => {
    setNotice('')
    const response = await fetch('/api/candidate/preboarding/confirm-start-date', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preboardingId: preboarding.id, startDate }) })
    const data = await response.json()
    setNotice(response.ok ? 'Start date confirmed.' : data.error || 'Unable to confirm start date.')
    if (response.ok) setPreboarding({ ...preboarding, confirmedStartDate: data.confirmedStartDate })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500 font-semibold">Loading your preboarding hub…</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Active Preboarding Clearance
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight mt-2">
                  Before you start
                </h1>
                <p className="text-xs text-slate-300">
                  Complete required forms, document verification, policy sign-offs, and compulsory orientation courses.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/10 text-xs space-y-1 text-right">
                <span className="text-slate-300">Mandatory Completion:</span>
                <span className="block text-2xl font-extrabold text-emerald-400">
                  {preboarding.overallCompletionPercentage}%
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${preboarding.overallCompletionPercentage}%` }}
              />
            </div>
          </div>

          {/* Reporting & Start Info Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Reporting & First-Day Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <label htmlFor="confirmed-start-date" className="block text-slate-400 font-semibold mb-1">Confirmed Start Date</label>
                <div className="flex gap-2"><input id="confirmed-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-w-0 rounded-lg border border-slate-300 px-2 py-1" /><button type="button" onClick={confirmStartDate} className="rounded-lg bg-blue-600 px-3 py-1 font-bold text-white">Confirm</button></div>
                {notice && <p role="status" className="mt-1 text-blue-700">{notice}</p>}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="block text-slate-400 font-semibold mb-0.5">Reporting Location</span>
                <span className="font-extrabold text-slate-900 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" /> {preboarding.reportingLocation || 'To be confirmed by HR'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="block text-slate-400 font-semibold mb-0.5">HR Orientation Officer</span>
                <span className="font-extrabold text-slate-900">
                  Recruitment team
                </span>
              </div>
            </div>
          </div>

          {/* Preboarding Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Pre-Employment Forms */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" /> Pre-Employment Forms
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {groupComplete(preboarding.forms, ['APPROVED', 'WAIVED']) ? 'Complete' : 'In progress'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {preboarding.forms.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800">{f.title}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Required Document Attachments */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-purple-600" /> Required Documents
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {groupComplete(preboarding.documents, ['APPROVED', 'WAIVED']) ? 'Verified' : 'In progress'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {preboarding.documents.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800">{d.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Policy Reading & Signatures */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" /> Policies & Digital Signatures
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {groupComplete(preboarding.policies, ['SIGNED', 'APPROVED', 'WAIVED']) ? 'Signed' : 'In progress'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {preboarding.policies.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800">{p.title}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Compulsory Pre-Resumption Courses */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" /> Compulsory Courses & Quizzes
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {groupComplete(preboarding.courses, ['COMPLETED', 'WAIVED']) ? 'Passed' : 'In progress'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {preboarding.courses.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800 block">{c.title}</span>
                      <span className="text-[10px] text-slate-500">Score: {c.score}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
