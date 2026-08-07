'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Wallet } from 'lucide-react'
import { EmptyState, SaveIndicator } from '@/components/ui/PageElements'
import { ReasonDialog } from '@/components/ui/Dialog'
import { staffingRequestStatusLabel } from '@/lib/staffing-request'

type Option = { id: string; name: string; code?: string; state?: string }

type FundingConfirmation = {
  id: string
  decision: string
  budgetLine: string | null
  salaryCeilingAmount: string | null
  maximumRecruitmentCost: string | null
  fundingEndDate: string | null
  grantFunded: boolean
  donorApprovalRequired: boolean
  comment: string | null
  decidedAt: string
}

type StaffingRequest = {
  id: string
  referenceNumber: string
  positionTitle: string
  numberOfPositions: number
  status: string
  urgency: string
  jobGrade: string
  contractType: string
  budgetLine: string
  fundingSource: string
  proposedSalaryCeiling: string | null
  expectedStartDate: string
  hiringManagerName: string
  hiringManagerUserId: string
  createdBy: string
  createdAt: string
  submittedAt: string | null
  decisionReason: string | null
  lockVersion: number
  department: { id: string; name: string }
  project: { id: string; name: string; code: string } | null
  dutyStation: { id: string; name: string; state: string }
  fundingConfirmations: FundingConfirmation[]
  vacancies: Array<{ id: string; referenceNumber: string; status: string }>
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-700',
  SUBMITTED: 'bg-sky-100 text-sky-900',
  RETURNED_FOR_CORRECTION: 'bg-amber-100 text-amber-900',
  AWAITING_FUNDING_CONFIRMATION: 'bg-amber-100 text-amber-900',
  FUNDING_CONFIRMED: 'bg-emerald-100 text-emerald-900',
  FUNDING_REJECTED: 'bg-rose-100 text-rose-900',
  AWAITING_HR_REVIEW: 'bg-sky-100 text-sky-900',
  HR_APPROVED: 'bg-emerald-100 text-emerald-900',
  AWAITING_EXECUTIVE_APPROVAL: 'bg-violet-100 text-violet-900',
  APPROVED_FOR_VACANCY: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  CANCELLED: 'bg-stone-200 text-stone-700',
}

const BLANK = {
  positionTitle: '',
  departmentId: '',
  projectId: '',
  dutyStationId: '',
  numberOfPositions: 1,
  isReplacement: false,
  previousHolder: '',
  recruitmentReason: '',
  reportingLine: '',
  contractType: '',
  contractDurationMonths: '',
  expectedStartDate: '',
  jobGrade: '',
  urgency: 'STANDARD',
  budgetLine: '',
  fundingSource: 'GRANT',
  fundingEndDate: '',
  proposedSalaryCeiling: '',
  donorRestrictions: '',
  requiredQualifications: '',
  requiredExperience: '',
  requiredLanguages: '',
  safeguardingSensitivity: 'STANDARD',
  proposedAssessmentMethod: '',
  proposedPanel: '',
  hiringManagerName: '',
  hiringManagerEmail: '',
  hiringManagerPhone: '',
}

export default function StaffingRequestWorkspace({
  currentUserId,
  currentUserEmail,
  capabilities,
  options,
}: {
  currentUserId: string
  currentUserEmail: string
  capabilities: { create: boolean; review: boolean; approve: boolean; confirmFunding: boolean }
  options: { departments: Option[]; dutyStations: Option[]; projects: Option[]; contractTypes: Option[] }
}) {
  const [requests, setRequests] = useState<StaffingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ ...BLANK, hiringManagerEmail: currentUserEmail })
  const [selectedId, setSelectedId] = useState('')
  /** Which reasoned action is being confirmed, if any. */
  const [pendingAction, setPendingAction] = useState<{
    request: StaffingRequest
    action: 'RETURN' | 'CANCEL'
  } | null>(null)
  const [fundingForm, setFundingForm] = useState({
    decision: 'CONFIRMED',
    budgetLine: '',
    salaryCeilingAmount: '',
    salaryCeilingCurrency: 'NGN',
    maximumRecruitmentCost: '',
    fundingEndDate: '',
    grantFunded: false,
    donorApprovalRequired: false,
    donorApprovalReference: '',
    comment: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/recruitment/staffing-requests', { cache: 'no-store' })
      if (!response.ok) throw new Error('Staffing requests could not be loaded.')
      const body = await response.json()
      setRequests(body.requests || [])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Staffing requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(() => requests.find((item) => item.id === selectedId) || null, [requests, selectedId])

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
      setNotice('Saved.')
      return body
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The action could not be completed.')
      return null
    } finally {
      setBusy('')
    }
  }

  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      ...form,
      projectId: form.projectId || null,
      contractDurationMonths: form.contractDurationMonths ? Number(form.contractDurationMonths) : null,
      fundingEndDate: form.fundingEndDate || null,
      previousHolder: form.previousHolder || null,
      proposedSalaryCeiling: form.proposedSalaryCeiling || null,
      donorRestrictions: form.donorRestrictions || null,
      requiredLanguages: form.requiredLanguages || null,
      proposedAssessmentMethod: form.proposedAssessmentMethod || null,
      proposedPanel: form.proposedPanel || null,
      hiringManagerPhone: form.hiringManagerPhone || null,
    }
    const result = await post('/api/recruitment/staffing-requests', payload, 'create')
    if (result) {
      setCreating(false)
      setForm({ ...BLANK, hiringManagerEmail: currentUserEmail })
      if (result.executiveApprovalExpected)
        setNotice(`Saved as draft. This request will need executive approval: ${result.executiveApprovalReason}.`)
    }
  }

  const act = (request: StaffingRequest, action: string, extra: Record<string, unknown> = {}) =>
    post(
      `/api/recruitment/staffing-requests/${request.id}/actions`,
      { action, lockVersion: request.lockVersion, ...extra },
      action
    )

  const confirmFunding = async (request: StaffingRequest) => {
    const payload = {
      ...fundingForm,
      salaryCeilingAmount: fundingForm.salaryCeilingAmount ? Number(fundingForm.salaryCeilingAmount) : null,
      maximumRecruitmentCost: fundingForm.maximumRecruitmentCost ? Number(fundingForm.maximumRecruitmentCost) : null,
      fundingEndDate: fundingForm.fundingEndDate || null,
      budgetLine: fundingForm.budgetLine || null,
      donorApprovalReference: fundingForm.donorApprovalReference || null,
      comment: fundingForm.comment || null,
    }
    await post(`/api/recruitment/staffing-requests/${request.id}/funding`, payload, 'funding')
  }

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="field-label">{label}</span>
      {node}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SaveIndicator status={busy ? 'Working…' : notice} />
        {capabilities.create && (
          <button type="button" onClick={() => setCreating((value) => !value)} className="btn-primary">
            <Plus className="h-4 w-4" />
            {creating ? 'Close form' : 'New staffing request'}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submitNew} className="space-y-6 border border-stone-300 bg-white p-6">
          <h2 className="text-base font-bold text-stone-950">Request details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {field(
              'Position title',
              <input
                required
                value={form.positionTitle}
                onChange={(event) => setForm({ ...form, positionTitle: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Job grade',
              <input
                required
                value={form.jobGrade}
                onChange={(event) => setForm({ ...form, jobGrade: event.target.value })}
                className="field-control"
              />,
              'Senior grades (D, E, SM, EX) route to executive approval.'
            )}
            {field(
              'Department',
              <select
                required
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                className="field-control"
              >
                <option value="">Choose a department</option>
                {options.departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            {field(
              'Project or grant',
              <select
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                className="field-control"
              >
                <option value="">Not project funded</option>
                {options.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            )}
            {field(
              'Duty station',
              <select
                required
                value={form.dutyStationId}
                onChange={(event) => setForm({ ...form, dutyStationId: event.target.value })}
                className="field-control"
              >
                <option value="">Choose a duty station</option>
                {options.dutyStations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}, {item.state}
                  </option>
                ))}
              </select>
            )}
            {field(
              'Number of positions',
              <input
                type="number"
                min={1}
                required
                value={form.numberOfPositions}
                onChange={(event) => setForm({ ...form, numberOfPositions: Number(event.target.value) })}
                className="field-control"
              />
            )}
            {field(
              'Contract type',
              <select
                required
                value={form.contractType}
                onChange={(event) => setForm({ ...form, contractType: event.target.value })}
                className="field-control"
              >
                <option value="">Choose a contract type</option>
                {options.contractTypes.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            {field(
              'Contract duration (months)',
              <input
                type="number"
                min={0}
                value={form.contractDurationMonths}
                onChange={(event) => setForm({ ...form, contractDurationMonths: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Expected start date',
              <input
                type="date"
                required
                value={form.expectedStartDate}
                onChange={(event) => setForm({ ...form, expectedStartDate: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Urgency',
              <select
                value={form.urgency}
                onChange={(event) => setForm({ ...form, urgency: event.target.value })}
                className="field-control"
              >
                <option value="STANDARD">Standard</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
              </select>,
              'Emergency requests always require executive approval.'
            )}
            {field(
              'Reporting line',
              <input
                required
                value={form.reportingLine}
                onChange={(event) => setForm({ ...form, reportingLine: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Safeguarding sensitivity',
              <select
                value={form.safeguardingSensitivity}
                onChange={(event) => setForm({ ...form, safeguardingSensitivity: event.target.value })}
                className="field-control"
              >
                <option value="STANDARD">Standard</option>
                <option value="ELEVATED">Elevated</option>
                <option value="HIGH">High</option>
              </select>,
              'Elevated and high sensitivity add safeguarding and criminal-record checks.'
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={form.isReplacement}
              onChange={(event) => setForm({ ...form, isReplacement: event.target.checked })}
            />
            This replaces someone who has left
          </label>
          {form.isReplacement &&
            field(
              'Previous holder',
              <input
                required
                value={form.previousHolder}
                onChange={(event) => setForm({ ...form, previousHolder: event.target.value })}
                className="field-control"
              />
            )}

          <h3 className="pt-2 text-sm font-bold text-stone-950">Funding</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field(
              'Budget line',
              <input
                required
                value={form.budgetLine}
                onChange={(event) => setForm({ ...form, budgetLine: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Funding source',
              <select
                value={form.fundingSource}
                onChange={(event) => setForm({ ...form, fundingSource: event.target.value })}
                className="field-control"
              >
                <option value="GRANT">Grant</option>
                <option value="UNRESTRICTED">Unrestricted</option>
                <option value="CORE">Core</option>
                <option value="OTHER">Other</option>
              </select>
            )}
            {field(
              'Funding end date',
              <input
                type="date"
                value={form.fundingEndDate}
                onChange={(event) => setForm({ ...form, fundingEndDate: event.target.value })}
                className="field-control"
              />,
              'Required for grant-funded positions.'
            )}
            {field(
              'Proposed salary ceiling',
              <input
                value={form.proposedSalaryCeiling}
                onChange={(event) => setForm({ ...form, proposedSalaryCeiling: event.target.value })}
                className="field-control"
              />
            )}
          </div>
          {field(
            'Donor restrictions',
            <textarea
              rows={2}
              value={form.donorRestrictions}
              onChange={(event) => setForm({ ...form, donorRestrictions: event.target.value })}
              className="field-control"
            />
          )}

          <h3 className="pt-2 text-sm font-bold text-stone-950">Justification and requirements</h3>
          {field(
            'Reason for recruitment',
            <textarea
              required
              rows={3}
              value={form.recruitmentReason}
              onChange={(event) => setForm({ ...form, recruitmentReason: event.target.value })}
              className="field-control"
            />
          )}
          {field(
            'Required technical qualifications',
            <textarea
              required
              rows={3}
              value={form.requiredQualifications}
              onChange={(event) => setForm({ ...form, requiredQualifications: event.target.value })}
              className="field-control"
            />
          )}
          {field(
            'Required experience',
            <textarea
              required
              rows={3}
              value={form.requiredExperience}
              onChange={(event) => setForm({ ...form, requiredExperience: event.target.value })}
              className="field-control"
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {field(
              'Required languages',
              <input
                value={form.requiredLanguages}
                onChange={(event) => setForm({ ...form, requiredLanguages: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Proposed assessment method',
              <input
                value={form.proposedAssessmentMethod}
                onChange={(event) => setForm({ ...form, proposedAssessmentMethod: event.target.value })}
                className="field-control"
              />
            )}
          </div>
          {field(
            'Proposed interview panel',
            <textarea
              rows={2}
              value={form.proposedPanel}
              onChange={(event) => setForm({ ...form, proposedPanel: event.target.value })}
              className="field-control"
            />
          )}

          <h3 className="pt-2 text-sm font-bold text-stone-950">Hiring manager</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {field(
              'Name',
              <input
                required
                value={form.hiringManagerName}
                onChange={(event) => setForm({ ...form, hiringManagerName: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Email',
              <input
                type="email"
                required
                value={form.hiringManagerEmail}
                onChange={(event) => setForm({ ...form, hiringManagerEmail: event.target.value })}
                className="field-control"
              />
            )}
            {field(
              'Phone',
              <input
                value={form.hiringManagerPhone}
                onChange={(event) => setForm({ ...form, hiringManagerPhone: event.target.value })}
                className="field-control"
              />
            )}
          </div>

          <div className="flex gap-3 border-t border-stone-200 pt-4">
            <button type="submit" disabled={Boolean(busy)} className="btn-primary">
              {busy === 'create' ? 'Saving…' : 'Save as draft'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
          <p className="text-xs text-stone-500">
            A job description must be attached to the saved draft before it can be submitted.
          </p>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-stone-600">Loading staffing requests…</p>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No staffing requests yet"
          description="A staffing request records the need, the justification and the budget line before any vacancy is prepared."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const funding = request.fundingConfirmations[0]
            const isOwner = request.createdBy === currentUserId || request.hiringManagerUserId === currentUserId
            const open = selectedId === request.id
            return (
              <article key={request.id} className="border border-stone-300 bg-white">
                <button
                  type="button"
                  onClick={() => setSelectedId(open ? '' : request.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-stone-50"
                  aria-expanded={open}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-stone-950">
                      {request.positionTitle} × {request.numberOfPositions}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-600">
                      {request.referenceNumber} · {request.department.name} · {request.dutyStation.name} · grade{' '}
                      {request.jobGrade}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      STATUS_TONE[request.status] || 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {staffingRequestStatusLabel(request.status)}
                  </span>
                </button>

                {open && (
                  <div className="space-y-5 border-t border-stone-200 px-5 py-5">
                    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ['Budget line', request.budgetLine],
                        ['Funding source', request.fundingSource],
                        ['Contract type', request.contractType],
                        ['Expected start', new Date(request.expectedStartDate).toLocaleDateString('en-GB')],
                        ['Urgency', request.urgency],
                        ['Hiring manager', request.hiringManagerName],
                        ['Proposed ceiling', request.proposedSalaryCeiling || 'Not stated'],
                        ['Project', request.project ? `${request.project.name} (${request.project.code})` : 'None'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
                          <dd className="mt-0.5 text-stone-900">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {request.decisionReason && (
                      <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-stone-800">
                        {request.decisionReason}
                      </p>
                    )}

                    {funding && (
                      <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                        <p className="font-semibold text-emerald-950">
                          Budget Holder decision: {funding.decision.toLowerCase()}
                        </p>
                        <p className="mt-1 text-emerald-900">
                          {funding.budgetLine && <>Budget line {funding.budgetLine}. </>}
                          {funding.salaryCeilingAmount && <>Ceiling {funding.salaryCeilingAmount}. </>}
                          {funding.fundingEndDate && (
                            <>Funded to {new Date(funding.fundingEndDate).toLocaleDateString('en-GB')}. </>
                          )}
                          {funding.donorApprovalRequired && <>Donor approval required. </>}
                        </p>
                        {funding.comment && <p className="mt-1 text-emerald-900">{funding.comment}</p>}
                      </div>
                    )}

                    {request.vacancies.length > 0 && (
                      <p className="text-sm text-stone-700">
                        Vacancy created: {request.vacancies.map((vacancy) => vacancy.referenceNumber).join(', ')}
                      </p>
                    )}

                    {/* §3.7 The funding decision form appears only for a Budget Holder,
                        and only while the request is actually awaiting the money. */}
                    {capabilities.confirmFunding &&
                      request.status === 'AWAITING_FUNDING_CONFIRMATION' &&
                      !isOwner && (
                        <div className="border border-stone-300 bg-stone-50 p-4">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-950">
                            <Wallet className="h-4 w-4" /> Confirm funding
                          </h3>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {field(
                              'Decision',
                              <select
                                value={fundingForm.decision}
                                onChange={(event) => setFundingForm({ ...fundingForm, decision: event.target.value })}
                                className="field-control"
                              >
                                <option value="CONFIRMED">Funding confirmed</option>
                                <option value="REJECTED">Not funded</option>
                                <option value="RETURNED">Return for correction</option>
                              </select>
                            )}
                            {field(
                              'Budget line',
                              <input
                                value={fundingForm.budgetLine}
                                onChange={(event) => setFundingForm({ ...fundingForm, budgetLine: event.target.value })}
                                className="field-control"
                                placeholder={request.budgetLine}
                              />
                            )}
                            {field(
                              'Salary / fee ceiling',
                              <input
                                type="number"
                                min={0}
                                value={fundingForm.salaryCeilingAmount}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, salaryCeilingAmount: event.target.value })
                                }
                                className="field-control"
                              />
                            )}
                            {field(
                              'Maximum recruitment cost',
                              <input
                                type="number"
                                min={0}
                                value={fundingForm.maximumRecruitmentCost}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, maximumRecruitmentCost: event.target.value })
                                }
                                className="field-control"
                              />
                            )}
                            {field(
                              'Funding end date',
                              <input
                                type="date"
                                value={fundingForm.fundingEndDate}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, fundingEndDate: event.target.value })
                                }
                                className="field-control"
                              />
                            )}
                            {field(
                              'Donor approval reference',
                              <input
                                value={fundingForm.donorApprovalReference}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, donorApprovalReference: event.target.value })
                                }
                                className="field-control"
                              />
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-800">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fundingForm.grantFunded}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, grantFunded: event.target.checked })
                                }
                              />
                              Grant funded
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={fundingForm.donorApprovalRequired}
                                onChange={(event) =>
                                  setFundingForm({ ...fundingForm, donorApprovalRequired: event.target.checked })
                                }
                              />
                              Donor approval required
                            </label>
                          </div>
                          <div className="mt-3">
                            {field(
                              'Comment',
                              <textarea
                                rows={2}
                                value={fundingForm.comment}
                                onChange={(event) => setFundingForm({ ...fundingForm, comment: event.target.value })}
                                className="field-control"
                              />,
                              'Required when returning or rejecting.'
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => confirmFunding(request)}
                            disabled={Boolean(busy)}
                            className="btn-primary mt-3"
                          >
                            {busy === 'funding' ? 'Recording…' : 'Record funding decision'}
                          </button>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4">
                      {isOwner && ['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(request.status) && (
                        <button
                          type="button"
                          onClick={() => act(request, 'SUBMIT')}
                          disabled={Boolean(busy)}
                          className="btn-primary"
                        >
                          Submit for funding
                        </button>
                      )}
                      {capabilities.review && request.status === 'AWAITING_HR_REVIEW' && (
                        <button
                          type="button"
                          onClick={() => act(request, 'HR_APPROVE')}
                          disabled={Boolean(busy)}
                          className="btn-primary"
                        >
                          HR approve
                        </button>
                      )}
                      {capabilities.approve && request.status === 'AWAITING_EXECUTIVE_APPROVAL' && (
                        <button
                          type="button"
                          onClick={() => act(request, 'EXECUTIVE_APPROVE')}
                          disabled={Boolean(busy)}
                          className="btn-primary"
                        >
                          Executive approve
                        </button>
                      )}
                      {capabilities.review &&
                        ['SUBMITTED', 'AWAITING_HR_REVIEW', 'AWAITING_EXECUTIVE_APPROVAL'].includes(request.status) && (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ request, action: 'RETURN' })}
                            disabled={Boolean(busy)}
                            className="btn-secondary"
                          >
                            Return for correction
                          </button>
                        )}
                      {(isOwner || capabilities.review) &&
                        !['APPROVED_FOR_VACANCY', 'REJECTED', 'CANCELLED'].includes(request.status) && (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ request, action: 'CANCEL' })}
                            disabled={Boolean(busy)}
                            className="btn-secondary"
                          >
                            Cancel request
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* The server requires a 10-character reason for both of these, so the
          dialog enforces the same minimum before the request is sent. */}
      <ReasonDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        busy={Boolean(busy)}
        tone={pendingAction?.action === 'CANCEL' ? 'danger' : 'default'}
        title={pendingAction?.action === 'CANCEL' ? 'Cancel staffing request' : 'Return for correction'}
        description={
          pendingAction?.action === 'CANCEL'
            ? `This closes ${pendingAction.request.positionTitle} (${pendingAction.request.referenceNumber}). The reason is recorded on the request and in the audit log.`
            : `The requester will see this and can resubmit once corrected.`
        }
        reasonLabel={pendingAction?.action === 'CANCEL' ? 'Reason for cancelling' : 'What needs correcting'}
        placeholder={
          pendingAction?.action === 'CANCEL'
            ? 'e.g. Post absorbed into an existing role following the structure review.'
            : 'e.g. The budget line does not match the project code; please confirm with Finance.'
        }
        reasonRequired
        minLength={10}
        confirmLabel={pendingAction?.action === 'CANCEL' ? 'Cancel request' : 'Return for correction'}
        onConfirm={async (reason) => {
          if (!pendingAction) return
          await act(pendingAction.request, pendingAction.action, { reason })
          setPendingAction(null)
        }}
      />
    </div>
  )
}
