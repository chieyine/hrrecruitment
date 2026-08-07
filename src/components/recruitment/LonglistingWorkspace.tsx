'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { SaveIndicator } from '@/components/ui/PageElements'
import { ReasonDialog } from '@/components/ui/Dialog'
import { RULE_TYPES, RULE_TYPE_LABELS, RULE_CLASSIFICATIONS, CLASSIFICATION_LABELS } from '@/lib/longlisting-rules'

type Vacancy = {
  id: string
  title: string
  referenceNumber: string
  status: string
  closingAt: string
  longlistingRulesLockedAt: string | null
  anonymisedReview: boolean
  applicationCount: number
}

type Rule = {
  id: string
  ruleType: string
  classification: string
  label: string
  field: string | null
  operator: string
  expected: unknown
  failureMessage: string
  weight: string
  displayOrder: number
}

type RuleChange = {
  id: string
  changeType: string
  reason: string
  status: string
  fairnessReviewRequired: boolean
  applicationsAtChange: number
  requestedAt: string
}

type Run = {
  id: string
  status: string
  trigger: string
  totalApplications: number
  completeApplications: number
  incompleteApplications: number
  automaticallyEligible: number
  automaticallyIneligible: number
  requiresReview: number
  duplicateApplications: number
  startedAt: string
  completedAt: string | null
  confirmedAt: string | null
  confirmationNote: string | null
  reasonDistribution: Array<{ ruleId: string; count: number; label: string }>
}

/** Rules that read an answer to a specific application question. */
const FIELD_RULES = new Set(['REQUIRED_ANSWER', 'MANDATORY_QUESTION', 'WILLINGNESS_TO_TRAVEL'])
/** Rules whose `field` carries a level or keyword rather than a question id. */
const QUALIFIER_RULES = new Set(['REQUIRED_LANGUAGE', 'REQUIRED_COMPUTER_SKILL', 'MINIMUM_TECHNICAL_EXPERIENCE'])
const NUMERIC_RULES = new Set([
  'MINIMUM_EXPERIENCE',
  'MINIMUM_NGO_EXPERIENCE',
  'MINIMUM_TECHNICAL_EXPERIENCE',
  'MINIMUM_MANAGEMENT_EXPERIENCE',
])
const LIST_RULES = new Set([
  'REQUIRED_FIELD_OF_STUDY',
  'REQUIRED_LICENCE',
  'REQUIRED_CERTIFICATION',
  'REQUIRED_LANGUAGE',
  'REQUIRED_COMPUTER_SKILL',
  'REQUIRED_SECTOR_EXPERIENCE',
  'WORK_AUTHORISATION',
  'MANDATORY_DOCUMENT',
])

const BLANK_RULE = {
  ruleType: 'MINIMUM_EXPERIENCE',
  classification: 'MANDATORY_KNOCKOUT',
  label: '',
  field: '',
  operator: 'GTE',
  expectedText: '',
  failureMessage: '',
  weight: '0',
  displayOrder: 0,
}

export default function LonglistingWorkspace({
  vacancies,
  initialVacancyId,
  capabilities,
}: {
  vacancies: Vacancy[]
  initialVacancyId: string
  capabilities: { manageRules: boolean; run: boolean; confirm: boolean; override: boolean }
}) {
  const [vacancyId, setVacancyId] = useState(initialVacancyId)
  const [rules, setRules] = useState<Rule[]>([])
  const [pendingChanges, setPendingChanges] = useState<RuleChange[]>([])
  const [questions, setQuestions] = useState<Array<{ id: string; label: string }>>([])
  const [locked, setLocked] = useState(false)
  const [applicationCount, setApplicationCount] = useState(0)
  const [runs, setRuns] = useState<Run[]>([])
  const [draft, setDraft] = useState({ ...BLANK_RULE })
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  /** Rule pending removal, and whether the confirmation dialog is open. */
  const [ruleToRemove, setRuleToRemove] = useState<Rule | null>(null)
  const [confirmingRunId, setConfirmingRunId] = useState('')

  const vacancy = vacancies.find((item) => item.id === vacancyId) || null

  const load = useCallback(async () => {
    if (!vacancyId) return
    setNotice('')
    try {
      const [rulesResponse, runsResponse] = await Promise.all([
        fetch(`/api/recruitment/longlisting/rules?vacancyId=${vacancyId}`, { cache: 'no-store' }),
        fetch(`/api/recruitment/longlisting/runs?vacancyId=${vacancyId}`, { cache: 'no-store' }),
      ])
      if (rulesResponse.ok) {
        const body = await rulesResponse.json()
        setRules(body.rules || [])
        setPendingChanges(body.pendingChanges || [])
        setLocked(Boolean(body.locked))
        setApplicationCount(body.applicationCount || 0)
        setQuestions(body.vacancy?.questions || [])
      }
      if (runsResponse.ok) {
        const body = await runsResponse.json()
        setRuns(body.runs || [])
      }
    } catch {
      setNotice('Longlisting details could not be loaded.')
    }
  }, [vacancyId])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (url: string, payload: unknown, label: string) => {
    setBusy(label)
    setNotice('')
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The action could not be completed.')
      await load()
      setNotice(
        body.requiresApproval
          ? body.fairnessReviewRequired
            ? 'Submitted for HR manager approval. A fairness review is required because applications have already been received.'
            : 'Submitted for HR manager approval.'
          : 'Saved.'
      )
      return body
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The action could not be completed.')
      return null
    } finally {
      setBusy('')
    }
  }

  /** Turn the single text input into the shape the rule type expects. */
  const parseExpected = (ruleType: string, text: string): unknown => {
    const trimmed = text.trim()
    if (NUMERIC_RULES.has(ruleType)) return Number(trimmed)
    if (LIST_RULES.has(ruleType))
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    if (ruleType === 'WILLINGNESS_TO_TRAVEL') return true
    return trimmed
  }

  const addRule = async (event: React.FormEvent) => {
    event.preventDefault()
    await post(
      '/api/recruitment/longlisting/rules',
      {
        action: 'CREATE',
        vacancyId,
        ruleType: draft.ruleType,
        classification: draft.classification,
        label: draft.label,
        field: draft.field || null,
        operator: draft.operator,
        expected: parseExpected(draft.ruleType, draft.expectedText),
        failureMessage: draft.failureMessage,
        weight: Number(draft.weight) || 0,
        displayOrder: rules.length,
      },
      'add'
    )
    setDraft({ ...BLANK_RULE })
    setAdding(false)
  }

  const removeRule = async (reason: string) => {
    if (!ruleToRemove) return
    await post(
      '/api/recruitment/longlisting/rules',
      { action: 'DEACTIVATE', ruleId: ruleToRemove.id, reason },
      'remove'
    )
    setRuleToRemove(null)
  }

  const latestRun = runs[0]
  const mandatoryCount = rules.filter((rule) => rule.classification === 'MANDATORY_KNOCKOUT').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-64 flex-1">
          <span className="field-label">Vacancy</span>
          <select value={vacancyId} onChange={(event) => setVacancyId(event.target.value)} className="field-control">
            {vacancies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.referenceNumber} — {item.title} ({item.applicationCount} applications)
              </option>
            ))}
          </select>
        </label>
        <SaveIndicator status={busy ? 'Working…' : notice} />
      </div>

      {vacancy && (
        <div className="flex flex-wrap items-center gap-3 border border-stone-300 bg-white px-5 py-4 text-sm">
          <span className="font-semibold text-stone-950">{vacancy.title}</span>
          <span className="text-stone-600">Status {vacancy.status.replaceAll('_', ' ').toLowerCase()}</span>
          <span className="text-stone-600">Closes {new Date(vacancy.closingAt).toLocaleDateString('en-GB')}</span>
          {locked && (
            <span className="inline-flex items-center gap-1 bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
              <Lock className="h-3 w-3" /> Rules locked
            </span>
          )}
          {vacancy.anonymisedReview && (
            <span className="bg-sky-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-900">
              Anonymised review
            </span>
          )}
        </div>
      )}

      {locked && (
        <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-stone-800">
          These rules locked when the vacancy was published. Changes now become proposals that an HR manager must
          approve, and because {applicationCount} application{applicationCount === 1 ? ' has' : 's have'} been received,
          any material change also triggers a fairness review.
        </p>
      )}

      {pendingChanges.length > 0 && (
        <section className="border border-violet-300 bg-violet-50 px-5 py-4">
          <h2 className="text-sm font-bold text-violet-950">Rule changes awaiting approval</h2>
          <ul className="mt-2 space-y-1 text-sm text-violet-900">
            {pendingChanges.map((change) => (
              <li key={change.id}>
                {change.changeType.toLowerCase()} — {change.reason}
                {change.fairnessReviewRequired && ` (fairness review required; ${change.applicationsAtChange} applications)`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-stone-950">Longlisting rules</h2>
          {capabilities.manageRules && !locked && (
            <button type="button" onClick={() => setAdding((value) => !value)} className="btn-secondary">
              <Plus className="h-4 w-4" />
              {adding ? 'Close' : 'Add rule'}
            </button>
          )}
        </div>

        {mandatoryCount === 0 && (
          <p className="border-l-4 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-stone-800">
            At least one mandatory knockout rule is needed before this vacancy can be published or longlisted.
          </p>
        )}

        {adding && (
          <form onSubmit={addRule} className="grid gap-4 border border-stone-300 bg-white p-5 md:grid-cols-2">
            <label>
              <span className="field-label">Rule type</span>
              <select
                value={draft.ruleType}
                onChange={(event) => setDraft({ ...draft, ruleType: event.target.value })}
                className="field-control"
              >
                {RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {RULE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Treatment</span>
              <select
                value={draft.classification}
                onChange={(event) => setDraft({ ...draft, classification: event.target.value })}
                className="field-control"
              >
                {RULE_CLASSIFICATIONS.map((value) => (
                  <option key={value} value={value}>
                    {CLASSIFICATION_LABELS[value]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-stone-500">
                Only a mandatory knockout can make an applicant automatically ineligible.
              </span>
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Rule name</span>
              <input
                required
                value={draft.label}
                onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                className="field-control"
                placeholder="At least 3 years of relevant experience"
              />
            </label>
            <label>
              <span className="field-label">
                {NUMERIC_RULES.has(draft.ruleType)
                  ? 'Minimum years'
                  : LIST_RULES.has(draft.ruleType)
                    ? 'Accepted values (comma separated)'
                    : 'Expected value'}
              </span>
              <input
                value={draft.expectedText}
                onChange={(event) => setDraft({ ...draft, expectedText: event.target.value })}
                className="field-control"
                type={NUMERIC_RULES.has(draft.ruleType) ? 'number' : 'text'}
                step="0.5"
              />
            </label>
            {FIELD_RULES.has(draft.ruleType) ? (
              <label>
                <span className="field-label">Application question</span>
                <select
                  value={draft.field}
                  onChange={(event) => setDraft({ ...draft, field: event.target.value })}
                  className="field-control"
                >
                  <option value="">Choose a question</option>
                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : QUALIFIER_RULES.has(draft.ruleType) ? (
              <label>
                <span className="field-label">
                  {draft.ruleType === 'REQUIRED_LANGUAGE'
                    ? 'Minimum level'
                    : draft.ruleType === 'REQUIRED_COMPUTER_SKILL'
                      ? 'Minimum proficiency'
                      : 'Matching keywords'}
                </span>
                <input
                  value={draft.field}
                  onChange={(event) => setDraft({ ...draft, field: event.target.value })}
                  className="field-control"
                  placeholder={draft.ruleType === 'REQUIRED_LANGUAGE' ? 'FLUENT' : 'INTERMEDIATE'}
                />
              </label>
            ) : (
              <span />
            )}
            {draft.ruleType === 'REQUIRED_ANSWER' && (
              <label>
                <span className="field-label">Comparison</span>
                <select
                  value={draft.operator}
                  onChange={(event) => setDraft({ ...draft, operator: event.target.value })}
                  className="field-control"
                >
                  {['EQUALS', 'IN', 'CONTAINS', 'TRUE', 'GTE', 'LTE', 'BEFORE', 'AFTER'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {draft.classification === 'SCORED' && (
              <label>
                <span className="field-label">Weight</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.weight}
                  onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
                  className="field-control"
                />
              </label>
            )}
            <label className="md:col-span-2">
              <span className="field-label">Message when not met</span>
              <input
                required
                minLength={5}
                value={draft.failureMessage}
                onChange={(event) => setDraft({ ...draft, failureMessage: event.target.value })}
                className="field-control"
                placeholder="Does not meet the minimum experience requirement"
              />
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={Boolean(busy)} className="btn-primary">
                {busy === 'add' ? 'Adding…' : 'Add rule'}
              </button>
            </div>
          </form>
        )}

        {rules.length === 0 ? (
          <p className="border border-dashed border-stone-300 bg-white px-5 py-6 text-center text-sm text-stone-600">
            No rules yet. Add the criteria that decide whether an applicant is eligible at all.
          </p>
        ) : (
          <div className="divide-y divide-stone-200 border border-stone-300 bg-white">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-950">{rule.label}</p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {RULE_TYPE_LABELS[rule.ruleType as keyof typeof RULE_TYPE_LABELS] || rule.ruleType} ·{' '}
                    {CLASSIFICATION_LABELS[rule.classification as keyof typeof CLASSIFICATION_LABELS] ||
                      rule.classification}
                    {rule.classification === 'SCORED' && ` · weight ${rule.weight}`} · expects{' '}
                    {JSON.stringify(rule.expected)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{rule.failureMessage}</p>
                </div>
                {capabilities.manageRules && (
                  <button
                    type="button"
                    onClick={() => setRuleToRemove(rule)}
                    disabled={Boolean(busy)}
                    className="btn-secondary"
                    aria-label={`Remove ${rule.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    {locked ? 'Propose removal' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-stone-950">Automatic longlisting</h2>
          {capabilities.run && (
            <button
              type="button"
              onClick={() =>
                post('/api/recruitment/longlisting/runs', { action: 'RUN', vacancyId, trigger: 'MANUAL' }, 'run')
              }
              disabled={Boolean(busy) || mandatoryCount === 0}
              className="btn-primary"
            >
              <Play className="h-4 w-4" />
              {busy === 'run' ? 'Running…' : 'Run longlisting'}
            </button>
          )}
        </div>

        {!latestRun ? (
          <p className="border border-dashed border-stone-300 bg-white px-5 py-6 text-center text-sm text-stone-600">
            No longlisting run yet for this vacancy.
          </p>
        ) : (
          <div className="border border-stone-300 bg-white">
            <div className="grid gap-3 border-b border-stone-200 p-5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Applications', latestRun.totalApplications, 'text-stone-900'],
                ['Complete', latestRun.completeApplications, 'text-stone-900'],
                ['Eligible', latestRun.automaticallyEligible, 'text-emerald-800'],
                ['Ineligible', latestRun.automaticallyIneligible, 'text-rose-800'],
                ['Need review', latestRun.requiresReview, 'text-amber-800'],
                ['Duplicates', latestRun.duplicateApplications, 'text-stone-900'],
              ].map(([label, value, tone]) => (
                <div key={String(label)}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
                  <p className={`mt-1 text-2xl font-bold ${tone}`}>{value as number}</p>
                </div>
              ))}
            </div>

            {latestRun.reasonDistribution.length > 0 && (
              <div className="border-b border-stone-200 p-5">
                <h3 className="text-sm font-bold text-stone-950">Why applicants were not eligible</h3>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {latestRun.reasonDistribution.map((reason) => (
                    <li key={reason.ruleId} className="flex justify-between gap-4">
                      <span>{reason.label}</span>
                      <span className="font-semibold">{reason.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-stone-600">
                {latestRun.status === 'CONFIRMED'
                  ? `Longlist confirmed ${latestRun.confirmedAt ? new Date(latestRun.confirmedAt).toLocaleString('en-GB') : ''}`
                  : latestRun.requiresReview > 0
                    ? `${latestRun.requiresReview} application(s) must be settled in the exception queue before this longlist can be confirmed.`
                    : 'Ready to confirm.'}
              </p>
              <div className="flex gap-2">
                <a href={`/recruitment/longlisting/exceptions?vacancy=${vacancyId}`} className="btn-secondary">
                  Exception queue
                </a>
                {capabilities.confirm && latestRun.status !== 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => setConfirmingRunId(latestRun.id)}
                    disabled={Boolean(busy) || latestRun.requiresReview > 0}
                    className="btn-primary"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {busy === 'confirm' ? 'Confirming…' : 'Confirm longlist'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* §11.7 Removing a locked rule is a change proposal, so the dialog says
          so plainly and holds the same 10-character minimum as the server. */}
      <ReasonDialog
        open={ruleToRemove !== null}
        onClose={() => setRuleToRemove(null)}
        busy={busy === 'remove'}
        tone="danger"
        title={locked ? 'Propose removing this rule' : 'Remove this rule'}
        description={
          locked
            ? `"${ruleToRemove?.label}" is locked because the vacancy is published. Removing it needs HR manager approval${
                applicationCount > 0
                  ? `, and because ${applicationCount} application${applicationCount === 1 ? ' has' : 's have'} already been received it will also trigger a fairness review`
                  : ''
              }.`
            : `"${ruleToRemove?.label}" will no longer be applied to this vacancy.`
        }
        reasonLabel="Reason"
        placeholder="e.g. The qualification requirement duplicates the field-of-study rule below it."
        reasonRequired
        minLength={10}
        confirmLabel={locked ? 'Submit for approval' : 'Remove rule'}
        onConfirm={removeRule}
      />

      {/* §11.8 The confirmation note becomes part of the longlisting approval
          record, so it is captured properly rather than through a prompt. */}
      <ReasonDialog
        open={confirmingRunId !== ''}
        onClose={() => setConfirmingRunId('')}
        busy={busy === 'confirm'}
        title="Confirm the longlist"
        description="This produces the confirmed longlist and moves every assessed application to its outcome. The decision is signed and recorded against your name."
        reasonLabel="Note for the approval record"
        placeholder="e.g. Reviewed all 12 exceptions with the hiring manager on 6 August."
        confirmLabel="Confirm longlist"
        onConfirm={async (note) => {
          await post('/api/recruitment/longlisting/runs', { action: 'CONFIRM', runId: confirmingRunId, note }, 'confirm')
          setConfirmingRunId('')
        }}
      />
    </div>
  )
}
