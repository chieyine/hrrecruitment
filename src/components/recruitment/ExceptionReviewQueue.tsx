'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, CircleSlash, HelpCircle } from 'lucide-react'
import { EmptyState, SaveIndicator } from '@/components/ui/PageElements'
import {
  OVERRIDE_REASON_CODES,
  OVERRIDE_REASON_LABELS,
  overrideRequiresEvidence,
  overrideRequiresApproval,
} from '@/lib/longlisting-rules'

type RuleResult = {
  ruleId: string
  label: string
  classification: string
  outcome: string
  observed: unknown
  expected: unknown
  message: string
}

type Exception = {
  id: string
  applicationId: string
  applicationReference: string | null
  candidateName: string | null
  anonymised: boolean
  vacancy: { id: string; title: string; referenceNumber: string } | null
  suggestedOutcome: string
  originalOutcome: string
  eligibilityScore: string | null
  maximumScore: string | null
  decidingRuleId: string | null
  results: RuleResult[]
  humanDecision: string | null
  decisionReason: string | null
  overrideReasonCode: string | null
  decidedAt: string | null
  evaluatedAt: string
}

const OUTCOME_TONE: Record<string, string> = {
  MET: 'text-emerald-800',
  NOT_MET: 'text-rose-800',
  UNCLEAR: 'text-amber-800',
  NOT_APPLICABLE: 'text-stone-500',
}

const SUGGESTED_LABEL: Record<string, string> = {
  REQUIRES_REVIEW: 'Needs a decision',
  INCOMPLETE_APPLICATION: 'Incomplete application',
  DUPLICATE_APPLICATION: 'Possible duplicate',
  AUTOMATICALLY_ELIGIBLE: 'Automatically eligible',
  AUTOMATICALLY_INELIGIBLE: 'Automatically ineligible',
}

export default function ExceptionReviewQueue({
  initialVacancyId,
  canOverride,
}: {
  initialVacancyId: string
  canOverride: boolean
}) {
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [showDecided, setShowDecided] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [openId, setOpenId] = useState('')
  const [decision, setDecision] = useState({
    humanDecision: 'ELIGIBLE',
    overrideReasonCode: 'EQUIVALENT_QUALIFICATION',
    decisionReason: '',
    evidenceFileId: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (initialVacancyId) params.set('vacancyId', initialVacancyId)
      if (showDecided) params.set('includeDecided', '1')
      const response = await fetch(`/api/recruitment/longlisting/exceptions?${params}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('The exception queue could not be loaded.')
      const body = await response.json()
      setExceptions(body.exceptions || [])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The exception queue could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [initialVacancyId, showDecided])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (exception: Exception) => {
    if (decision.decisionReason.trim().length < 10) {
      setNotice('Explain the decision in at least 10 characters.')
      return
    }
    if (overrideRequiresEvidence(decision.overrideReasonCode) && !decision.evidenceFileId.trim()) {
      setNotice('This override reason requires supporting evidence.')
      return
    }
    setBusy(exception.id)
    setNotice('')
    try {
      const response = await fetch('/api/recruitment/longlisting/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId: exception.id,
          humanDecision: decision.humanDecision,
          overrideReasonCode: decision.overrideReasonCode,
          decisionReason: decision.decisionReason,
          evidenceFileId: decision.evidenceFileId || null,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The decision could not be recorded.')
      setNotice(body.requiresApproval ? 'Recorded and sent for HR manager approval.' : 'Decision recorded.')
      setOpenId('')
      setDecision({ ...decision, decisionReason: '', evidenceFileId: '' })
      await load()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The decision could not be recorded.')
    } finally {
      setBusy('')
    }
  }

  const reverses = (exception: Exception) =>
    (exception.originalOutcome === 'AUTOMATICALLY_INELIGIBLE' && decision.humanDecision === 'ELIGIBLE') ||
    (exception.originalOutcome === 'AUTOMATICALLY_ELIGIBLE' && decision.humanDecision === 'INELIGIBLE')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" checked={showDecided} onChange={(event) => setShowDecided(event.target.checked)} />
          Include decisions already made
        </label>
        <SaveIndicator status={busy ? 'Saving…' : notice} />
      </div>

      {loading ? (
        <p className="text-sm text-stone-600">Loading the exception queue…</p>
      ) : exceptions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description="Every application in the most recent run was settled automatically. Exceptions appear here when a rule cannot be decided from the information supplied."
        />
      ) : (
        <div className="space-y-3">
          {exceptions.map((exception) => {
            const open = openId === exception.id
            return (
              <article key={exception.id} className="border border-stone-300 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? '' : exception.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-stone-50"
                  aria-expanded={open}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-stone-950">
                      {/* §28.3 an anonymised vacancy shows a reference, never a name. */}
                      {exception.anonymised
                        ? exception.applicationReference || 'Anonymised applicant'
                        : exception.candidateName || exception.applicationReference || 'Applicant'}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-600">
                      {exception.vacancy?.referenceNumber} · {exception.vacancy?.title}
                      {exception.eligibilityScore &&
                        ` · score ${exception.eligibilityScore}/${exception.maximumScore ?? '—'}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {exception.humanDecision && (
                      <span className="bg-emerald-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                        {exception.humanDecision.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    )}
                    <span className="bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
                      {SUGGESTED_LABEL[exception.suggestedOutcome] || exception.suggestedOutcome}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="space-y-5 border-t border-stone-200 px-5 py-5">
                    <div>
                      <h3 className="text-sm font-bold text-stone-950">How each rule was assessed</h3>
                      {exception.results.length === 0 ? (
                        <p className="mt-2 text-sm text-stone-600">
                          No rule results were recorded — this application was flagged before rules were applied.
                        </p>
                      ) : (
                        <ul className="mt-2 divide-y divide-stone-100 border border-stone-200">
                          {exception.results.map((result) => (
                            <li
                              key={result.ruleId}
                              className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm ${
                                result.ruleId === exception.decidingRuleId ? 'bg-amber-50' : ''
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="font-medium text-stone-900">{result.label}</span>
                                <span className="mt-0.5 block text-xs text-stone-600">
                                  expected {JSON.stringify(result.expected)} · found {JSON.stringify(result.observed)}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 text-xs font-bold uppercase tracking-wide ${
                                  OUTCOME_TONE[result.outcome] || 'text-stone-600'
                                }`}
                              >
                                {result.outcome.replaceAll('_', ' ').toLowerCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {exception.humanDecision ? (
                      <div className="border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm">
                        <p className="font-semibold text-emerald-950">
                          Decided: {exception.humanDecision.replaceAll('_', ' ').toLowerCase()}
                          {exception.overrideReasonCode &&
                            ` — ${OVERRIDE_REASON_LABELS[exception.overrideReasonCode as keyof typeof OVERRIDE_REASON_LABELS] ?? exception.overrideReasonCode}`}
                        </p>
                        <p className="mt-1 text-emerald-900">{exception.decisionReason}</p>
                        <p className="mt-1 text-xs text-emerald-800">
                          The original automatic result ({exception.originalOutcome.replaceAll('_', ' ').toLowerCase()})
                          is preserved.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 border border-stone-300 bg-stone-50 p-4">
                        <h3 className="text-sm font-bold text-stone-950">Record a decision</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label>
                            <span className="field-label">Decision</span>
                            <select
                              value={decision.humanDecision}
                              onChange={(event) => setDecision({ ...decision, humanDecision: event.target.value })}
                              className="field-control"
                            >
                              <option value="ELIGIBLE">Eligible — include in the longlist</option>
                              <option value="INELIGIBLE">Not eligible</option>
                              <option value="NEEDS_MORE_INFORMATION">Need more information from the applicant</option>
                            </select>
                          </label>
                          <label>
                            <span className="field-label">Reason code</span>
                            <select
                              value={decision.overrideReasonCode}
                              onChange={(event) =>
                                setDecision({ ...decision, overrideReasonCode: event.target.value })
                              }
                              className="field-control"
                            >
                              {OVERRIDE_REASON_CODES.map((code) => (
                                <option key={code} value={code}>
                                  {OVERRIDE_REASON_LABELS[code]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {overrideRequiresEvidence(decision.overrideReasonCode) && (
                          <label className="block">
                            <span className="field-label">Supporting evidence file ID</span>
                            <input
                              value={decision.evidenceFileId}
                              onChange={(event) => setDecision({ ...decision, evidenceFileId: event.target.value })}
                              className="field-control"
                            />
                            <span className="mt-1 block text-xs text-stone-500">
                              This reason code requires evidence on file.
                            </span>
                          </label>
                        )}
                        <label className="block">
                          <span className="field-label">Written justification</span>
                          <textarea
                            rows={3}
                            minLength={10}
                            value={decision.decisionReason}
                            onChange={(event) => setDecision({ ...decision, decisionReason: event.target.value })}
                            className="field-control"
                            placeholder="Explain what you checked and why this decision follows from it."
                          />
                        </label>

                        {reverses(exception) && !canOverride && (
                          <p className="border-l-4 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-stone-800">
                            <CircleSlash className="mr-1 inline h-4 w-4" />
                            Reversing an automatic outcome needs override authority. Ask an HR manager.
                          </p>
                        )}
                        {overrideRequiresApproval(decision.overrideReasonCode) && (
                          <p className="flex items-start gap-2 text-xs text-stone-600">
                            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            This reason code routes the decision to an HR manager for approval before it takes effect.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => submit(exception)}
                          disabled={busy === exception.id || (reverses(exception) && !canOverride)}
                          className="btn-primary"
                        >
                          {busy === exception.id ? 'Saving…' : 'Record decision'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
