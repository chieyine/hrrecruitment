'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { CheckCircle2, ArrowLeft, FileCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

const CHECK_LABELS: Record<string, string> = {
  OFFER_ACCEPTED: 'Offer Accepted & Signed',
  ID_APPROVED: 'National Identification Verified',
  QUALIFICATION_APPROVED: 'Academic Certificates Verified',
  FORMS_APPROVED: 'Pre-Employment & Bank Forms Approved',
  POLICIES_SIGNED: 'Code of Conduct & Policies Signed',
  COURSES_COMPLETED: 'Compulsory Pre-Resumption Courses Passed',
  TASKS_COMPLETED: 'Pre-Resumption Tasks Completed',
  REFERENCES_SATISFACTORY: 'Digital Reference Check Satisfactory',
  HR_REVIEW: 'Final HR Clearance Review',
}

export default function HRPreboardingClearancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const [checks, setChecks] = useState<any[]>([])
  const [preboarding, setPreboarding] = useState<any>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [information, setInformation] = useState({
    category: 'GENERAL',
    title: '',
    content: '',
    acknowledgementRequired: true,
  })
  const [meeting, setMeeting] = useState({
    title: '',
    description: '',
    scheduledStart: '',
    scheduledEnd: '',
    timezone: 'Africa/Lagos',
    venue: '',
    meetingLink: '',
    required: true,
  })

  const load = useCallback(() => {
    fetch(`/api/recruitment/preboarding/${params.id}`)
      .then(async (res) => {
        const json = await res.json()
        if (res.ok && json.preboarding?.readinessChecks) {
          setPreboarding(json.preboarding)
          setPackages(json.packages || [])
          setRequirements(json.requirements || [])
          setChecks(
            json.preboarding.readinessChecks.map((c: any) => ({
              id: c.id,
              type: c.checkType,
              label: CHECK_LABELS[c.checkType] || c.checkType,
              status: c.status,
            }))
          )
        }
      })
      .catch(console.error)
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const [comment, setComment] = useState('')
  const [waiveItem, setWaiveItem] = useState(false)
  const [waiverReason, setWaiverReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const { toast } = useToast()
  // Pending dialog request: manage-item review or check waiver needing a reason.
  const [pending, setPending] = useState<
    { kind: 'manage'; action: string; resourceId?: string; status?: string } | { kind: 'waive'; checkId: string } | null
  >(null)

  const doManage = async (
    action: string,
    resourceId: string | undefined,
    status: string | undefined,
    comment: string
  ) => {
    const res = await fetch(`/api/recruitment/preboarding/${params.id}/manage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(preboarding?.lockVersion || 1) },
      body: JSON.stringify({ action, resourceId, status, comment, lockVersion: preboarding?.lockVersion }),
    })
    const data = await res.json()
    if (res.ok) {
      toast('success', 'Preboarding item updated.')
      setPending(null)
      load()
    } else {
      toast('error', data.error || 'Update failed.')
    }
  }

  const manage = (action: string, resourceId?: string, status?: string) => {
    const needsComment = [
      'RETURNED',
      'REJECTED',
      'RESUBMISSION_REQUIRED',
      'MISSED',
      'CANCELLED',
      'WAIVED',
      'RESET_ATTEMPTS',
    ].includes(status || '')
    if (needsComment) setPending({ kind: 'manage', action, resourceId, status })
    else void doManage(action, resourceId, status, '')
  }

  const manageData = async (action: 'ADD_INFORMATION' | 'ADD_MEETING', data: Record<string, unknown>) => {
    const res = await fetch(`/api/recruitment/preboarding/${params.id}/manage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(preboarding?.lockVersion || 1) },
      body: JSON.stringify({ action, data, lockVersion: preboarding?.lockVersion }),
    })
    const body = await res.json()
    if (!res.ok) return toast('error', body.error || 'The item could not be added.')
    toast('success', action === 'ADD_MEETING' ? 'Meeting added.' : 'Reporting information added.')
    if (action === 'ADD_MEETING')
      setMeeting({
        title: '',
        description: '',
        scheduledStart: '',
        scheduledEnd: '',
        timezone: 'Africa/Lagos',
        venue: '',
        meetingLink: '',
        required: true,
      })
    else setInformation({ category: 'GENERAL', title: '', content: '', acknowledgementRequired: true })
    load()
  }

  const reviewCheck = async (checkId: string, status: string, reason = '') => {
    if (status === 'WAIVED' && !reason) {
      setPending({ kind: 'waive', checkId })
      return
    }
    const res = await fetch(`/api/recruitment/preboarding/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkId, status, reason }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error || 'Review failed')
      return
    }
    setChecks((current) => current.map((item) => (item.id === checkId ? { ...item, status } : item)))
    setMsg('Readiness check updated.')
  }

  const handleConfirmClearance = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/recruitment/preboarding/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preboardingId: params.id,
          comment,
          waivers: waiveItem ? [{ checkType: 'HR_REVIEW', reason: waiverReason }] : [],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMsg('Candidate Readiness Confirmed! Candidate status updated to READY_TO_RESUME.')
      } else {
        setMsg(data.error || 'Clearance could not be confirmed.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {msg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
          )}

          <div className="rounded-2xl bg-slate-900 p-8 text-white shadow-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
              HR Preboarding Clearance Workspace
            </span>
            <h1 className="text-3xl font-extrabold">Candidate Readiness Checklist</h1>
            <p className="text-xs text-slate-300">
              Evaluate each mandatory requirement before issuing physical/remote resumption clearance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-900">Package & requirement management</h2>
            <div className="flex flex-wrap gap-2">
              <select id="package-select" className="rounded-lg border p-2 text-xs">
                <option value="">Select package</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const value = (document.getElementById('package-select') as HTMLSelectElement)?.value
                  if (value) manage('ASSIGN_PACKAGE', value)
                }}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white"
              >
                Assign package
              </button>
              <select id="requirement-select" className="rounded-lg border p-2 text-xs">
                <option value="">Add document requirement</option>
                {requirements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const value = (document.getElementById('requirement-select') as HTMLSelectElement)?.value
                  if (value) manage('ADD_DOCUMENT', value)
                }}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white"
              >
                Add requirement
              </button>
            </div>
            {[
              ['Forms', preboarding?.forms || [], 'formTemplate', 'REVIEW_FORM', ['APPROVED', 'RETURNED']],
              [
                'Documents',
                preboarding?.documents || [],
                'documentRequirement',
                'REVIEW_DOCUMENT',
                ['APPROVED', 'RESUBMISSION_REQUIRED'],
              ],
              [
                'Policies',
                preboarding?.policyAcknowledgements || [],
                'policyDocument',
                'REVIEW_POLICY',
                ['APPROVED', 'REJECTED'],
              ],
              ['Tasks', preboarding?.tasks || [], 'taskTemplate', 'REVIEW_TASK', ['APPROVED', 'RETURNED']],
              ['Courses', preboarding?.courses || [], 'course', 'REVIEW_COURSE', ['WAIVED', 'RESET_ATTEMPTS']],
            ].map(([label, items, relation, action, statuses]: any) => (
              <div key={label}>
                <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"
                    >
                      <span className="font-semibold">
                        {item[relation]?.title || item[relation]?.name} — {item.status}
                      </span>
                      <div className="flex gap-1">
                        {statuses.map((status: string) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => manage(action, item.id, status)}
                            className="rounded bg-slate-800 px-2 py-1 font-bold text-white"
                          >
                            {status.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void manageData('ADD_INFORMATION', information)
              }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
            >
              <div>
                <h2 className="font-bold text-slate-900">Reporting information</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Share practical instructions the candidate needs before their first day.
                </p>
              </div>
              <input
                required
                minLength={2}
                value={information.title}
                onChange={(event) => setInformation({ ...information, title: event.target.value })}
                placeholder="For example: First-day reporting instructions"
                className="field-control"
              />
              <input
                value={information.category}
                onChange={(event) => setInformation({ ...information, category: event.target.value })}
                placeholder="Category"
                className="field-control"
              />
              <textarea
                required
                minLength={5}
                rows={5}
                value={information.content}
                onChange={(event) => setInformation({ ...information, content: event.target.value })}
                placeholder="Write the address, arrival time, contact person and anything to bring."
                className="field-control"
              />
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={information.acknowledgementRequired}
                  onChange={(event) =>
                    setInformation({ ...information, acknowledgementRequired: event.target.checked })
                  }
                />
                Ask the candidate to confirm they have read this
              </label>
              <button className="btn-primary">Add information</button>
            </form>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void manageData('ADD_MEETING', meeting)
              }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
            >
              <div>
                <h2 className="font-bold text-slate-900">Orientation or check-in</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Schedule the meeting and give the candidate one clear place to find the details.
                </p>
              </div>
              <input
                required
                minLength={2}
                value={meeting.title}
                onChange={(event) => setMeeting({ ...meeting, title: event.target.value })}
                placeholder="Meeting title"
                className="field-control"
              />
              <textarea
                rows={2}
                value={meeting.description}
                onChange={(event) => setMeeting({ ...meeting, description: event.target.value })}
                placeholder="Purpose and preparation"
                className="field-control"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <label>
                  <span className="field-label">Starts</span>
                  <input
                    required
                    type="datetime-local"
                    value={meeting.scheduledStart}
                    onChange={(event) => setMeeting({ ...meeting, scheduledStart: event.target.value })}
                    className="field-control"
                  />
                </label>
                <label>
                  <span className="field-label">Ends</span>
                  <input
                    required
                    type="datetime-local"
                    value={meeting.scheduledEnd}
                    onChange={(event) => setMeeting({ ...meeting, scheduledEnd: event.target.value })}
                    className="field-control"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={meeting.venue}
                  onChange={(event) => setMeeting({ ...meeting, venue: event.target.value })}
                  placeholder="Venue (if in person)"
                  className="field-control"
                />
                <input
                  type="url"
                  value={meeting.meetingLink}
                  onChange={(event) => setMeeting({ ...meeting, meetingLink: event.target.value })}
                  placeholder="Meeting link (if online)"
                  className="field-control"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={meeting.required}
                  onChange={(event) => setMeeting({ ...meeting, required: event.target.checked })}
                />
                Attendance is required
              </label>
              <button className="btn-primary">Schedule meeting</button>
            </form>
          </div>

          {preboarding?.meetings?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">Meeting attendance</h2>
              <div className="mt-3 space-y-2">
                {preboarding.meetings.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border bg-slate-50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <b>{item.title}</b>
                      <p className="text-slate-500">
                        {new Date(item.scheduledStart).toLocaleString()} · Candidate response:{' '}
                        {item.candidateResponse?.replace(/_/g, ' ') || 'No response'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['CONFIRMED', 'ATTENDED', 'MISSED', 'CANCELLED', 'WAIVED'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => manage('UPDATE_MEETING', item.id, status)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 font-bold"
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist Verification Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Mandatory Preboarding Readiness Items
            </h2>

            <div className="space-y-3">
              {checks.map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      className={`h-5 w-5 ${item.status === 'PASSED' ? 'text-emerald-600' : 'text-slate-300'}`}
                    />
                    <span className="font-bold text-slate-900">{item.label}</span>
                  </div>
                  <span
                    className={`px-3 py-0.5 rounded-full font-bold text-[10px] border ${item.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}
                  >
                    {item.status}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewCheck(item.id, 'PASSED')}
                      className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white"
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewCheck(item.id, 'FAILED')}
                      className="rounded-lg bg-rose-600 px-2 py-1 font-bold text-white"
                    >
                      Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewCheck(item.id, 'WAIVED')}
                      className="rounded-lg bg-amber-600 px-2 py-1 font-bold text-white"
                    >
                      Waive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Clearance Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Confirm Candidate Readiness to Resume
            </h2>

            <form onSubmit={handleConfirmClearance} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">HR Clearance Officer Comment</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Record final clearance verification comments..."
                  className="w-full rounded-xl border border-slate-300 p-3 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiveItem}
                    onChange={(e) => setWaiveItem(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600"
                  />
                  <span>Approve HR Requirement Waiver Exception</span>
                </label>

                {waiveItem && (
                  <div className="space-y-1 pt-2">
                    <label className="block font-bold text-amber-900">Waiver Exception Reason</label>
                    <textarea
                      required={waiveItem}
                      rows={2}
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                      placeholder="State reason for waiving requirement prior to resumption..."
                      className="w-full rounded-xl border border-amber-300 p-2.5 focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  <FileCheck className="h-4 w-4" />
                  {submitting ? 'Confirming Clearance...' : 'Confirm Candidate Ready to Resume'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />

      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return
          if (pending.kind === 'manage') await doManage(pending.action, pending.resourceId, pending.status, reason)
          else {
            await reviewCheck(pending.checkId, 'WAIVED', reason)
            setPending(null)
          }
        }}
        title={pending?.kind === 'waive' ? 'Waive readiness check' : 'Review reason'}
        description={
          pending?.kind === 'waive'
            ? 'Record the approved waiver reason. This is written to the audit trail.'
            : 'Explain the review outcome for the candidate and the audit trail.'
        }
        confirmLabel={pending?.kind === 'waive' ? 'Waive check' : 'Submit review'}
        reasonRequired
        tone={pending?.kind === 'waive' ? 'danger' : 'default'}
      />
    </div>
  )
}
