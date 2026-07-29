'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Circle, FileCheck2, Printer, UserCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { formatDate } from '@/lib/utils'

type Outcome = 'RESUMED' | 'POSTPONED' | 'DID_NOT_RESUME' | 'WITHDRAWN'

function label(value?: string | null) {
  return value ? value.replaceAll('_', ' ').toLowerCase() : 'not recorded'
}

function countComplete(items: string[] = [], completed: string[]) {
  return items.filter((item) => completed.includes(item)).length
}

export default function JoiningHandoverPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome>('RESUMED')
  const [actualStartDate, setActualStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [newPlannedStartDate, setNewPlannedStartDate] = useState('')
  const [reportingLocation, setReportingLocation] = useState('')
  const [supervisorConfirmed, setSupervisorConfirmed] = useState(false)
  const [resumptionComment, setResumptionComment] = useState('')
  const [erpNumber, setErpNumber] = useState('')
  const [createdInErpAt, setCreatedInErpAt] = useState(new Date().toISOString().slice(0, 10))
  const [erpComment, setErpComment] = useState('')

  const loadSummary = async () => {
    const response = await fetch(`/api/recruitment/applications/${id}/handover-summary`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Joining handover could not be loaded.')
    setSummary(body.handoverSummary)
    setReportingLocation((current) => current || body.handoverSummary.dutyStation || '')
  }

  useEffect(() => {
    let active = true
    loadSummary()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Joining handover could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // The application id is stable for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const preboarding = summary?.preboarding
  const readinessItems = useMemo(
    () =>
      preboarding
        ? [
            {
              label: 'Forms',
              value: `${countComplete(preboarding.forms, ['APPROVED', 'WAIVED'])}/${preboarding.forms.length}`,
            },
            {
              label: 'Documents',
              value: `${countComplete(preboarding.documents, ['APPROVED', 'WAIVED'])}/${preboarding.documents.length}`,
            },
            {
              label: 'Policies',
              value: `${countComplete(preboarding.policies, ['SIGNED', 'APPROVED', 'WAIVED'])}/${preboarding.policies.length}`,
            },
            {
              label: 'Courses',
              value: `${countComplete(preboarding.courses, ['COMPLETED', 'WAIVED'])}/${preboarding.courses.length}`,
            },
            {
              label: 'Tasks',
              value: `${countComplete(preboarding.tasks, ['COMPLETED', 'APPROVED', 'WAIVED'])}/${preboarding.tasks.length}`,
            },
          ]
        : [],
    [preboarding]
  )

  const resumed = summary?.resumptionOutcome === 'RESUMED'
  const transferred = summary?.applicationStatus === 'TRANSFERRED_TO_ERP' || Boolean(summary?.erpPersonnelNumber)
  const canRecordAdverse = Boolean(summary?.capabilities?.recordAdverseOutcome)

  const recordOutcome = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy('outcome')
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/recruitment/applications/${id}/resumption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          actualStartDate: outcome === 'RESUMED' ? actualStartDate : undefined,
          newPlannedStartDate: outcome === 'POSTPONED' ? newPlannedStartDate : undefined,
          reportingLocation: outcome === 'RESUMED' ? reportingLocation : undefined,
          supervisorConfirmation: outcome === 'RESUMED' ? supervisorConfirmed : false,
          comment: resumptionComment || undefined,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The outcome could not be recorded.')
      await loadSummary()
      setNotice(
        outcome === 'RESUMED'
          ? 'Resumption confirmed. The ERP handover is now available.'
          : outcome === 'POSTPONED'
            ? 'The revised start date has been recorded.'
            : 'The resumption outcome has been recorded.'
      )
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The outcome could not be recorded.')
    } finally {
      setBusy(null)
    }
  }

  const recordErpTransfer = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy('erp')
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/recruitment/applications/${id}/erp-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          erpPersonnelNumber: erpNumber,
          createdInErpAt,
          comment: erpComment || undefined,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The ERP handover could not be recorded.')
      await loadSummary()
      setNotice(`ERP personnel number ${body.erpPersonnelNumber} recorded. Recruitment is complete.`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The ERP handover could not be recorded.')
    } finally {
      setBusy(null)
    }
  }

  if (loading)
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="flex flex-1 items-center justify-center">
          <p className="text-sm text-stone-600">Loading joining handover…</p>
        </main>
        <Footer />
      </div>
    )

  if (!summary)
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-stone-950">Joining handover unavailable</h1>
            <p className="mt-2 text-sm text-stone-600">{error}</p>
            <Link href={`/recruitment/applications/${id}`} className="btn-secondary mt-5">
              Back to application
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/recruitment/applications/${id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Application
            </Link>
            <button type="button" onClick={() => window.print()} className="btn-secondary print:hidden">
              <Printer className="h-4 w-4" />
              Print summary
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              {notice}
            </p>
          )}

          <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-brand-800">Joining handover</p>
            <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{summary.candidateFullName}</h1>
                <p className="mt-2 text-stone-600">
                  {summary.jobTitle} · {summary.department}
                </p>
              </div>
              <span className="status-chip bg-stone-100 capitalize text-stone-700">
                {label(summary.applicationStatus)}
              </span>
            </div>
          </header>

          <ol className="grid gap-3 sm:grid-cols-3" aria-label="Joining handover progress">
            {[
              {
                title: 'Preboarding cleared',
                complete: ['READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(summary.applicationStatus),
              },
              { title: 'Resumption confirmed', complete: resumed || transferred },
              { title: 'ERP record created', complete: transferred },
            ].map((step, index) => (
              <li
                key={step.title}
                className={`flex items-center gap-3 rounded-xl border p-4 ${
                  step.complete ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'
                }`}
              >
                {step.complete ? (
                  <Check className="h-5 w-5 text-emerald-700" />
                ) : (
                  <Circle className="h-5 w-5 text-stone-300" />
                )}
                <div>
                  <p className="text-xs text-stone-500">Step {index + 1}</p>
                  <p className="text-sm font-semibold text-stone-950">{step.title}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="section-panel" aria-labelledby="handover-summary-heading">
            <div className="section-heading">
              <div>
                <h2 id="handover-summary-heading" className="text-lg font-semibold text-stone-950">
                  Employment summary
                </h2>
                <p className="mt-1 text-sm text-stone-600">The agreed details needed to complete the handover.</p>
              </div>
            </div>
            <dl className="grid gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Email', summary.email || '—'],
                ['Phone', summary.primaryPhone || '—'],
                ['Duty station', summary.dutyStation || '—'],
                ['Contract', label(summary.contractType)],
                ['Approved salary', summary.salary || '—'],
                ['Planned start', summary.plannedStartDate ? formatDate(summary.plannedStartDate) : '—'],
              ].map(([term, value]) => (
                <div key={term} className="bg-white p-4">
                  <dt className="text-xs font-medium text-stone-500">{term}</dt>
                  <dd className="mt-1 text-sm font-semibold capitalize text-stone-950">{value}</dd>
                </div>
              ))}
            </dl>

            {preboarding && (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                  <FileCheck2 className="h-4 w-4 text-brand-800" />
                  Preboarding record
                </h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {readinessItems.map((item) => (
                    <div key={item.label} className="rounded-lg bg-stone-50 p-3">
                      <dt className="text-xs text-stone-500">{item.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-stone-950">{item.value}</dd>
                    </div>
                  ))}
                  <div className="rounded-lg bg-stone-50 p-3">
                    <dt className="text-xs text-stone-500">Verified documents</dt>
                    <dd className="mt-1 text-sm font-semibold text-stone-950">{summary.verifiedDocumentCount}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          {!resumed && !transferred && (
            <section className="section-panel print:hidden" aria-labelledby="resumption-heading">
              <div className="section-heading">
                <div>
                  <h2 id="resumption-heading" className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                    <UserCheck className="h-5 w-5 text-brand-800" />
                    Record the start-date outcome
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Confirm what happened. ERP transfer remains locked until resumption is verified.
                  </p>
                </div>
              </div>
              <form onSubmit={recordOutcome} className="space-y-5">
                <label className="block text-sm font-medium text-stone-800">
                  Outcome
                  <select
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value as Outcome)}
                    className="field-control mt-2"
                  >
                    <option value="RESUMED">Resumed</option>
                    <option value="POSTPONED">Start postponed</option>
                    {canRecordAdverse && <option value="DID_NOT_RESUME">Did not resume</option>}
                    {canRecordAdverse && <option value="WITHDRAWN">Candidate withdrew</option>}
                  </select>
                </label>

                {outcome === 'RESUMED' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-stone-800">
                      Actual start date
                      <input
                        required
                        type="date"
                        value={actualStartDate}
                        onChange={(event) => setActualStartDate(event.target.value)}
                        className="field-control mt-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-800">
                      Reporting location
                      <input
                        required
                        value={reportingLocation}
                        onChange={(event) => setReportingLocation(event.target.value)}
                        className="field-control mt-2"
                      />
                    </label>
                  </div>
                )}

                {outcome === 'POSTPONED' && (
                  <label className="block text-sm font-medium text-stone-800">
                    Revised planned start date
                    <input
                      required
                      type="date"
                      value={newPlannedStartDate}
                      onChange={(event) => setNewPlannedStartDate(event.target.value)}
                      className="field-control mt-2"
                    />
                  </label>
                )}

                <label className="block text-sm font-medium text-stone-800">
                  {['DID_NOT_RESUME', 'WITHDRAWN'].includes(outcome) ? 'Reason' : 'Note'}
                  <textarea
                    required={['DID_NOT_RESUME', 'WITHDRAWN'].includes(outcome)}
                    minLength={['DID_NOT_RESUME', 'WITHDRAWN'].includes(outcome) ? 10 : undefined}
                    rows={3}
                    value={resumptionComment}
                    onChange={(event) => setResumptionComment(event.target.value)}
                    className="field-control mt-2"
                  />
                </label>

                {outcome === 'RESUMED' && (
                  <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm text-stone-800">
                    <input
                      required
                      type="checkbox"
                      checked={supervisorConfirmed}
                      onChange={(event) => setSupervisorConfirmed(event.target.checked)}
                      className="mt-0.5 size-4"
                    />
                    The receiving supervisor confirmed that the person started work on the date recorded above.
                  </label>
                )}

                <button
                  disabled={busy !== null || (outcome === 'RESUMED' && !supervisorConfirmed)}
                  className="btn-primary"
                >
                  {busy === 'outcome' ? 'Recording…' : 'Record outcome'}
                </button>
              </form>
            </section>
          )}

          <section
            className={`section-panel print:hidden ${!resumed && !transferred ? 'opacity-60' : ''}`}
            aria-labelledby="erp-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="erp-heading" className="text-lg font-semibold text-stone-950">
                  Record the ERP employee number
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Use the number created in FRAD’s HR system after the person has started.
                </p>
              </div>
            </div>

            {transferred ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <Check className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-semibold text-emerald-950">Handover complete</p>
                  <p className="mt-1 text-sm text-emerald-900">
                    ERP employee number <span className="font-mono font-semibold">{summary.erpPersonnelNumber}</span>
                    {summary.transferredAt ? ` · recorded ${formatDate(summary.transferredAt)}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={recordErpTransfer} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-800">
                  ERP employee number
                  <input
                    required
                    disabled={!resumed}
                    value={erpNumber}
                    onChange={(event) => setErpNumber(event.target.value)}
                    className="field-control mt-2 font-mono"
                  />
                </label>
                <label className="text-sm font-medium text-stone-800">
                  Date created in ERP
                  <input
                    required
                    disabled={!resumed}
                    type="date"
                    value={createdInErpAt}
                    onChange={(event) => setCreatedInErpAt(event.target.value)}
                    className="field-control mt-2"
                  />
                </label>
                <label className="block text-sm font-medium text-stone-800 sm:col-span-2">
                  Note
                  <textarea
                    disabled={!resumed}
                    rows={3}
                    value={erpComment}
                    onChange={(event) => setErpComment(event.target.value)}
                    className="field-control mt-2"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button disabled={!resumed || busy !== null || !erpNumber.trim()} className="btn-primary">
                    {busy === 'erp' ? 'Recording…' : 'Complete handover'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
