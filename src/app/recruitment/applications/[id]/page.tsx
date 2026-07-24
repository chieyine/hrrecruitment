'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { formatDate, formatDateTime, getStatusBadgeClass } from '@/lib/utils'
import { ReasonDialog } from '@/components/ui/Dialog'
import MessageComposer from '@/components/shared/MessageComposer'
import { ArrowLeft, CheckCircle2, User, Award, Star, ShieldAlert, Download, Clock3, FileText, MessageSquare, Mail, History, ClipboardCheck } from 'lucide-react'

export default async function ApplicationReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newStage, setNewStage] = useState('')
  const [stageReason, setStageReason] = useState('')
  const [savingStage, setSavingStage] = useState(false)
  const [criteria, setCriteria] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [scoreComments, setScoreComments] = useState<Record<string, string>>({})
  const [savingScore, setSavingScore] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState(false)
  const [conflictType, setConflictType] = useState('')
  const [conflictDetails, setConflictDetails] = useState('')

  const [loadError, setLoadError] = useState('')
  const [eligibility, setEligibility] = useState<any>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/recruitment/applications/${params.id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load application')
        if (active) setApp(json.application)
        // Load the real screening scorecard template + criteria.
        const scRes = await fetch(`/api/recruitment/scorecards?applicationId=${params.id}`)
        if (scRes.ok) {
          const scJson = await scRes.json()
          const crit = scJson.template?.criteria ?? []
          if (active) {
            setCriteria(crit)
            setScores(Object.fromEntries(crit.map((c: any) => [c.id, 0])))
          }
        }
      } catch (e: any) {
        if (active) setLoadError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [params.id])

  useEffect(() => {
    fetch(`/api/recruitment/eligibility?applicationId=${params.id}`).then((response)=>response.json()).then((body)=>setEligibility(body.evaluations?.[0]||null)).catch(()=>undefined)
  }, [params.id])

  const [decidingEligibility, setDecidingEligibility] = useState<string | null>(null)

  const decideEligibility = async (humanDecision: string, decisionReason: string) => {
    if (!eligibility) return
    if (decisionReason.length < 10) {
      setMsg('The eligibility decision reason must be at least 10 characters.')
      return
    }
    const response = await fetch('/api/recruitment/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'DECIDE', evaluationId: eligibility.id, humanDecision, decisionReason }) })
    const body = await response.json(); setMsg(response.ok ? 'Eligibility decision recorded.' : body.error || 'Eligibility decision failed'); if (response.ok) { setEligibility(body.result); setDecidingEligibility(null) }
  }

  const handleStageChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStage) return
    setSavingStage(true)
    setMsg('')
    setMsgError(false)
    try {
      const res = await fetch(`/api/recruitment/applications/${params.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalStatus: newStage,
          reason: stageReason,
          lockVersion: app.lockVersion,
        }),
      })

      const body = await res.json()
      if (res.ok) {
        setApp((prev: any) => ({ ...prev, ...body.application }))
        setNewStage('')
        setStageReason('')
        setMsg('Application stage updated.')
      } else {
        setMsgError(true)
        setMsg(body.error || 'Application stage could not be updated.')
      }
    } catch (err) {
      console.error(err)
      setMsgError(true)
      setMsg('Application stage could not be updated. Check your connection and try again.')
    } finally {
      setSavingStage(false)
    }
  }

  const maxTotal = criteria.reduce((a, c) => a + (c.maximumScore || 0), 0)

  const handleScorecardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (criteria.length === 0) {
      setMsg('No screening scorecard template is configured for this vacancy.')
      return
    }
    if (!conflictType) { setMsg('Complete the conflict-of-interest declaration first.'); return }
    setSavingScore(true)
    try {
      const declaration = await fetch(`/api/recruitment/applications/${params.id}/conflict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conflictType, details: conflictDetails }),
      })
      const declarationJson = await declaration.json()
      if (!declaration.ok) { setMsg(declarationJson.error || 'Conflict declaration failed.'); return }
      const res = await fetch('/api/recruitment/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: params.id,
          criterionScores: criteria.map((c) => ({
            criterionId: c.id,
            score: scores[c.id] ?? 0,
            comment: scoreComments[c.id]?.trim() || undefined,
          })),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setMsg(`Scorecard saved. Total weighted score: ${json.totalScore}. Use "Update Stage" to longlist/shortlist.`)
      } else {
        setMsg(json.error || 'Failed to save scorecard.')
      }
    } catch (err) {
      console.error(err)
      setMsg('Failed to save scorecard.')
    } finally {
      setSavingScore(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500 font-semibold">Loading applicant details...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (loadError || !app) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-rose-700">{loadError || 'Application not found.'}</p>
            <Link href="/recruitment/applications" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
              Back to applications
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const outstanding = [
    ...(!app.submittedAt ? ['Application is still a draft.'] : []),
    ...(app.possibleDuplicates?.length ? ['Possible duplicate identity needs review.'] : []),
    ...(app.interviews || []).flatMap((interview: any) => {
      const missing = Math.max(0, (interview.panelMembers?.length || 0) - (interview.panelSubmissions?.length || 0))
      return missing ? [`${missing} panel score${missing === 1 ? '' : 's'} missing for ${interview.title || 'the interview'}.`] : []
    }),
    ...(app.offers || []).filter((offer: any) => ['SENT', 'VIEWED'].includes(offer.status) && new Date(offer.acceptanceDeadline) < new Date(Date.now() + 48 * 60 * 60_000)).map((offer: any) => `Offer response is due ${formatDateTime(offer.acceptanceDeadline)}.`),
    ...(app.preboardings || []).filter((item: any) => item.readinessStatus !== 'READY_TO_RESUME' && item.confirmedStartDate && new Date(item.confirmedStartDate) < new Date(Date.now() + 7 * 86400000)).map(() => 'Preboarding is not ready for the confirmed start date.'),
    ...(app.deliveryHistory || []).filter((item: any) => ['FAILED', 'DEAD_LETTER'].includes(item.status)).map((item: any) => `Message delivery failed: ${item.subject || 'candidate notification'}.`),
  ]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {msg && (
            <div role={msgError ? 'alert' : 'status'} className={`rounded-xl border p-4 text-xs font-bold flex items-center gap-2 ${msgError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}
          {app?.possibleDuplicates?.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Possible duplicate candidate record</div>
              <p className="mt-1">A matching phone number appears on {app.possibleDuplicates.length} other profile{app.possibleDuplicates.length === 1 ? '' : 's'}. Verify identity before progressing; do not merge records automatically.</p>
            </div>
          )}

          {/* Applicant Header */}
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(app?.internalStatus)}`}>
                  {app?.internalStatus?.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {app?.vacancy?.referenceNumber}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Application record · {app?.candidate?.legalFirstName} {app?.candidate?.lastName}
              </h1>
              <p className="text-xs text-slate-500">
                Applying for <strong>{app?.vacancy?.title}</strong> ({app?.vacancy?.department?.name})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {app.capabilities?.exportDocumentation && <>
                <a href={`/api/recruitment/applications/${params.id}/documentation`} className="btn-secondary">
                  <Download className="h-4 w-4" /> Export case records
                </a>
                <a href={`/api/recruitment/applications/${params.id}/documentation?includeFiles=1`} className="btn-secondary">
                  <FileText className="h-4 w-4" /> Export with attachments
                </a>
              </>}
              <Link
                href={`/recruitment/applications/${params.id}/handover`}
                className="btn-primary"
              >
                <Award className="h-4 w-4" /> Handover and ERP
              </Link>
            </div>
          </div>

          <section className="section-panel" aria-labelledby="case-position-heading">
            <div className="section-heading">
              <div>
                <h2 id="case-position-heading" className="text-lg font-bold text-slate-950">Case position</h2>
                <p className="mt-1 text-sm text-slate-600">The current evidence and outstanding parts of this recruitment case.</p>
              </div>
              <span className="status-chip bg-slate-100 text-slate-700">Updated {formatDate(app.updatedAt)}</span>
            </div>
            <dl className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Application', app.submittedAt ? `Submitted ${formatDate(app.submittedAt)}` : 'Draft — not submitted'],
                ['Assessment', app.candidateAssessments?.[0] ? `${app.candidateAssessments[0].assessment.title}: ${app.candidateAssessments[0].status.replaceAll('_', ' ')}` : 'Not started'],
                ['Interview', app.interviews?.[0] ? `${app.interviews[0].status.replaceAll('_', ' ')} · ${formatDate(app.interviews[0].scheduledStart)}` : 'Not arranged'],
                ['References', `${app.referenceStatus.replaceAll('_', ' ')} · ${app.referees?.filter((referee: any) => referee.requests?.some((request: any) => request.response)).length || 0}/${app.referees?.length || 0} received`],
                ['Offer', app.offers?.[0]?.status?.replaceAll('_', ' ') || 'Not created'],
                ['Preboarding', app.preboardings?.[0] ? `${app.preboardings[0].overallCompletionPercentage}% · ${app.preboardings[0].readinessStatus.replaceAll('_', ' ')}` : 'Not started'],
              ].map(([label, value]) => <div key={label} className="bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>)}
            </dl>
            <div className={`mt-4 border p-4 ${outstanding.length ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
              <p className="text-sm font-bold">{outstanding.length ? `${outstanding.length} item${outstanding.length === 1 ? '' : 's'} may block progress` : 'No recorded blockers'}</p>
              {outstanding.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{outstanding.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-1 text-xs">The available case evidence does not show an overdue or unresolved exception.</p>}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Candidate Profile & Application Snapshot */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" /> Candidate Profile & Qualifications
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-400">Email</span>
                    <span className="font-bold text-slate-900">{app?.candidate?.user?.email}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Phone</span>
                    <span className="font-bold text-slate-900">{app?.candidate?.user?.phone}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Nationality</span>
                    <span className="font-bold text-slate-900">{app?.candidate?.nationality}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Location</span>
                    <span className="font-bold text-slate-900">{app?.candidate?.state}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="block text-xs font-bold text-slate-700">Education Snapshot:</span>
                  {app?.candidate?.education?.map((edu: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <strong>{edu.qualification} in {edu.fieldOfStudy}</strong> ({edu.institution}, {edu.completionYear})
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <span className="block text-xs font-bold text-slate-700">Employment Snapshot:</span>
                  {app?.candidate?.employment?.map((emp: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <strong>{emp.jobTitle}</strong> at {emp.employer} ({String(emp.startDate ?? '').slice(0, 4)} - {emp.isCurrent || !emp.endDate ? 'Present' : String(emp.endDate).slice(0, 4)})
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-bold text-slate-900">Application answers</h4>
                  {app.answers?.length ? <dl className="mt-3 divide-y divide-slate-100">{app.answers.map((answer: any) => <div key={answer.id} className="py-3"><dt className="text-xs font-semibold text-slate-600">{answer.vacancyQuestion.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{String(answer.answerJson).replace(/^"|"$/g, '')}</dd></div>)}</dl> : <p className="mt-2 text-sm text-slate-500">No vacancy-specific answers were recorded.</p>}
                  <p className="mt-3 text-xs text-slate-500">{app.files?.length || 0} application attachment{app.files?.length === 1 ? '' : 's'} recorded.</p>
                </div>
              </div>

              <section className="section-panel" aria-labelledby="timeline-heading">
                <div className="section-heading">
                  <div><h3 id="timeline-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><Clock3 className="h-5 w-5 text-blue-700" />Case timeline</h3><p className="mt-1 text-sm text-slate-600">Stage changes are recorded in chronological order for accountability.</p></div>
                  <span className="status-chip bg-slate-100 text-slate-700">{app.stageHistory?.length || 0} changes</span>
                </div>
                {app.stageHistory?.length ? <ol className="relative ml-2 border-l border-slate-300">{[...app.stageHistory].reverse().map((event: any) => <li key={event.id} className="relative ml-5 pb-5 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-blue-700 ring-4 ring-white" /><p className="text-sm font-semibold text-slate-900">{event.fromStatus.replaceAll('_', ' ')} → {event.toStatus.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(event.createdAt)}{event.reason ? ` · ${event.reason}` : ''}</p></li>)}</ol> : <p className="text-sm text-slate-500">No stage changes have been recorded.</p>}
                <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600"><MessageSquare className="mr-2 inline h-4 w-4" />{app.messageThreads?.reduce((total: number, thread: any) => total + thread.messages.length, 0) || 0} candidate messages recorded.</div>
              </section>

              <section className="section-panel" aria-labelledby="communications-heading">
                <div className="section-heading"><div><h3 id="communications-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><Mail className="h-5 w-5 text-blue-700" />Communications and delivery</h3><p className="mt-1 text-sm text-slate-600">Messages, replies, read state and outbound delivery for this candidate.</p></div></div>
                <div className="space-y-4">
                  {(app.messageThreads || []).map((thread: any) => <article key={thread.id} className="border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><p className="text-sm font-bold text-slate-900">{thread.subject}</p><p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{thread.category.replaceAll('_', ' ')}{thread.restricted ? ' · restricted' : ''}</p></div>
                    <div className="divide-y divide-slate-100">{thread.messages.map((message: any) => <div key={message.id} className="p-4"><div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500"><span>{message.sender?.email || 'System user'}</span><span>{formatDateTime(message.sentAt)} · {message.readAt ? `read ${formatDateTime(message.readAt)}` : 'not yet read'}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.body}</p></div>)}</div>
                  </article>)}
                  {!app.messageThreads?.length && <p className="text-sm text-slate-500">No candidate messages have been recorded.</p>}
                  <div className="border-t border-slate-200 pt-4"><MessageComposer applicationId={params.id} /></div>
                  <details className="border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold text-slate-900">Email delivery history ({app.deliveryHistory?.length || 0})</summary><div className="mt-3 divide-y divide-slate-100">{(app.deliveryHistory || []).map((delivery: any) => <div key={delivery.id} className="py-3 text-xs"><div className="flex justify-between gap-3"><span className="font-semibold text-slate-900">{delivery.subject || 'Candidate notification'}</span><span className={['FAILED', 'DEAD_LETTER'].includes(delivery.status) ? 'font-bold text-rose-700' : 'font-bold text-slate-600'}>{delivery.status}</span></div><p className="mt-1 text-slate-500">{formatDateTime(delivery.createdAt)} · {delivery.attempts} attempt{delivery.attempts === 1 ? '' : 's'}{delivery.lastError ? ` · ${delivery.lastError}` : ''}</p></div>)}</div></details>
                </div>
              </section>

              <section className="section-panel" aria-labelledby="governance-heading">
                <div className="section-heading"><div><h3 id="governance-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><ClipboardCheck className="h-5 w-5 text-blue-700" />Decisions, notes and audit</h3><p className="mt-1 text-sm text-slate-600">The accountable record behind this case.</p></div></div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div><h4 className="text-sm font-bold">Approval decisions</h4>{app.approvals?.length ? <div className="mt-2 divide-y divide-slate-100">{app.approvals.map((approval: any) => <div key={approval.id} className="py-3 text-xs"><p className="font-semibold">{approval.resourceType} · stage {approval.stage} · {approval.decision}</p><p className="mt-1 text-slate-500">{formatDateTime(approval.createdAt)}{approval.comment ? ` · ${approval.comment}` : ''}</p></div>)}</div> : <p className="mt-2 text-xs text-slate-500">No approval decisions recorded.</p>}</div>
                  <div><h4 className="text-sm font-bold">Case notes</h4>{app.notes?.length ? <div className="mt-2 divide-y divide-slate-100">{app.notes.map((note: any) => <div key={note.id} className="py-3 text-xs"><p className="font-semibold">{note.category.replaceAll('_', ' ')}{note.restricted ? ' · restricted' : ''}</p><p className="mt-1 whitespace-pre-wrap text-slate-700">{note.content}</p><p className="mt-1 text-slate-500">{formatDateTime(note.createdAt)}</p></div>)}</div> : <p className="mt-2 text-xs text-slate-500">No case notes recorded.</p>}</div>
                </div>
                <details className="mt-5 border border-slate-200 p-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-bold"><History className="h-4 w-4" />Audit history ({app.auditHistory?.length || 0})</summary><ol className="mt-3 divide-y divide-slate-100">{(app.auditHistory || []).map((entry: any) => <li key={entry.id} className="py-3 text-xs"><p className="font-semibold text-slate-900">{entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-slate-500">{entry.resourceType} · {formatDateTime(entry.createdAt)}{entry.reason ? ` · ${entry.reason}` : ''}</p></li>)}</ol></details>
              </section>

              {/* Screening Scorecard Module */}
              <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Complete Screening Scorecard
                </h3>

                {criteria.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No screening scorecard template is configured for this vacancy.
                  </p>
                ) : (
                  <form onSubmit={handleScorecardSubmit} className="space-y-4 text-xs">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <label className="block font-bold text-amber-900">Conflict-of-interest declaration</label>
                      <select required value={conflictType} onChange={(e) => setConflictType(e.target.value)} className="w-full rounded-lg border border-amber-300 bg-white p-2">
                        <option value="">Select declaration</option><option value="NONE">I have no conflict</option><option value="FAMILY">Family</option><option value="PERSONAL">Personal</option><option value="SUPERVISORY">Supervisory</option><option value="COLLEAGUE">Colleague</option><option value="FINANCIAL">Financial</option><option value="OTHER">Other</option>
                      </select>
                      {conflictType && conflictType !== 'NONE' && <textarea required value={conflictDetails} onChange={(e) => setConflictDetails(e.target.value)} placeholder="Describe the conflict. Scoring will remain blocked until HR resolves it." className="w-full rounded-lg border border-amber-300 p-2" />}
                    </div>
                    {criteria.map((c) => (
                      <div key={c.id}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-900">
                            {c.name} (Max: {c.maximumScore})
                          </label>
                          <span className="font-mono font-bold text-blue-600">
                            {scores[c.id] ?? 0}/{c.maximumScore}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={c.maximumScore}
                          value={scores[c.id] ?? 0}
                          onChange={(e) => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                          className="w-full accent-blue-600"
                        />
                        {c.guidance && <p className="text-[11px] text-slate-400 mt-0.5">{c.guidance}</p>}
                        <textarea
                          required={Boolean(c.commentRequired)}
                          value={scoreComments[c.id] ?? ''}
                          onChange={(event) => setScoreComments({ ...scoreComments, [c.id]: event.target.value })}
                          placeholder={c.commentRequired ? 'Comment required' : 'Optional scoring comment'}
                          className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-xs"
                          rows={2}
                        />
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold text-sm">
                      <span>Total Score:</span>
                      <span className="font-mono text-blue-700">
                        {Object.values(scores).reduce((a, b) => a + b, 0)} / {maxTotal}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={savingScore}
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition-all"
                    >
                      {savingScore ? 'Saving Scorecard...' : 'Submit Scorecard'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Stage Movement & Notes */}
            <div className="space-y-6">
              {eligibility && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xs font-bold uppercase text-slate-700">Objective eligibility review</h3><p className="mt-2 text-sm font-bold">System suggestion: {eligibility.suggestedOutcome.replace(/_/g,' ')}</p><p className="mt-1 text-xs text-slate-500">This is decision support only. A staff member must confirm the outcome and reason.</p>{!eligibility.humanDecision?<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>setDecidingEligibility('ELIGIBLE')} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Confirm eligible</button><button onClick={()=>setDecidingEligibility('INELIGIBLE')} className="rounded bg-rose-700 px-3 py-2 text-xs font-bold text-white">Confirm ineligible</button><button onClick={()=>setDecidingEligibility('NEEDS_MORE_INFORMATION')} className="rounded border px-3 py-2 text-xs font-bold">Request more information</button></div>:<p className="mt-3 rounded bg-blue-50 p-2 text-xs"><b>Human decision:</b> {eligibility.humanDecision} — {eligibility.decisionReason}</p>}</div>}
              <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                  Update Candidate Stage
                </h3>

                <form onSubmit={handleStageChange} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Stage</label>
                    <select
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">Select Stage</option>
                      <option value="LONGLISTED">Longlisted</option>
                      <option value="SHORTLISTED">Shortlisted</option>
                      <option value="INELIGIBLE">Ineligible</option>
                      <option value="CANCELLED">Cancel application</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason / HR Note</label>
                    <textarea
                      rows={2}
                      value={stageReason}
                      onChange={(e) => setStageReason(e.target.value)}
                      placeholder="Optional stage justification..."
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingStage}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition-all"
                  >
                    {savingStage ? 'Updating...' : 'Update Stage'}
                  </button>
                </form>
              </div>

              {/* ERP Protocol Note */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> ERP Handover Note:
                </span>
                <p>
                  ERP record creation occurs strictly after actual physical/remote resumption confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <ReasonDialog
        open={decidingEligibility !== null}
        onClose={() => setDecidingEligibility(null)}
        onConfirm={(reason) => { if (decidingEligibility) return decideEligibility(decidingEligibility, reason) }}
        title={`Confirm: ${decidingEligibility?.replace(/_/g, ' ').toLowerCase() || ''}`}
        description="Record the evidence-based reason for this human decision (minimum 10 characters). It is written to the audit trail."
        confirmLabel="Record decision"
        reasonLabel="Evidence-based reason"
        reasonRequired
        tone={decidingEligibility === 'INELIGIBLE' ? 'danger' : 'default'}
      />
    </div>
  )
}
