'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Plus, Briefcase, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

type Employment = {
  id: string
  employer: string
  jobTitle: string
  employmentType: string
  country: string
  startDate: string
  endDate: string | null
  isCurrent: boolean
  responsibilities: string | null
  state: string | null
  location: string | null
}

const emptyForm = {
  employer: '',
  jobTitle: '',
  employmentType: '',
  country: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  responsibilities: '',
  state: '',
  location: '',
}

const dateValue = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export default function CandidateEmploymentPage() {
  const [employmentList, setEmploymentList] = useState<Employment[]>([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Employment | null>(null)

  const loadData = useCallback(async () => {
    const response = await fetch('/api/candidate/profile')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Unable to load employment history')
    setEmploymentList(body.profile?.employment ?? [])
  }, [])

  useEffect(() => {
    void loadData().catch((reason) =>
      setError(reason instanceof Error ? reason.message : 'Unable to load employment history')
    )
  }, [loadData])

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setShowForm(true)
    setMessage('')
    setError('')
  }
  const openEdit = (employment: Employment) => {
    setEditingId(employment.id)
    setFormData({
      employer: employment.employer,
      jobTitle: employment.jobTitle,
      employmentType: employment.employmentType,
      country: employment.country,
      startDate: dateValue(employment.startDate),
      endDate: dateValue(employment.endDate),
      isCurrent: employment.isCurrent,
      responsibilities: employment.responsibilities ?? '',
      state: employment.state ?? '',
      location: employment.location ?? '',
    })
    setShowForm(true)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(editingId ? `/api/candidate/employment/${editingId}` : '/api/candidate/employment', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          endDate: formData.isCurrent || !formData.endDate ? undefined : formData.endDate,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save employment record')
      setMessage(editingId ? 'Employment record updated.' : 'Employment record added.')
      setEditingId(null)
      setFormData(emptyForm)
      setShowForm(false)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save employment record')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (employment: Employment) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/candidate/employment/${employment.id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to delete employment record')
      setMessage('Employment record deleted.')
      await loadData()
      setDeleteTarget(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete employment record')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Profile
          </Link>
          <PageIntro
            eyebrow="Your profile"
            title="Employment history"
            description="Add the roles that help FRAD understand your experience. References are requested separately, if needed."
            actions={
              <button type="button" onClick={openAdd} className="btn-primary">
                <Plus className="h-4 w-4" /> Add a role
              </button>
            }
          />

          {message && (
            <div
              role="status"
              className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5" /> {message}
            </div>
          )}
          {error && (
            <p role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </p>
          )}

          {showForm && (
            <form onSubmit={save} className="section-panel space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-950">{editingId ? 'Edit role' : 'Add a role'}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Enter the organisation, role and dates as they appear on your records.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Employer or organisation"
                  value={formData.employer}
                  onChange={(employer) => setFormData({ ...formData, employer })}
                  required
                />
                <Field
                  label="Job title"
                  value={formData.jobTitle}
                  onChange={(jobTitle) => setFormData({ ...formData, jobTitle })}
                  required
                />
                <label className="text-sm font-medium">
                  Employment type *
                  <select
                    aria-label="Employment type"
                    required
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="field-control"
                  >
                    <option value="">Select one</option>
                    {[
                      'FULL_TIME',
                      'PART_TIME',
                      'CONTRACT',
                      'TEMPORARY',
                      'CONSULTANCY',
                      'SELF_EMPLOYED',
                      'INTERNSHIP',
                      'VOLUNTEER',
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Country"
                  value={formData.country}
                  onChange={(country) => setFormData({ ...formData, country })}
                  required
                />
                <Field label="State" value={formData.state} onChange={(state) => setFormData({ ...formData, state })} />
                <Field
                  label="City or location"
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                />
                <Field
                  label="Start date"
                  type="date"
                  value={formData.startDate}
                  onChange={(startDate) => setFormData({ ...formData, startDate })}
                  required
                />
                <Field
                  label="End date"
                  type="date"
                  value={formData.endDate}
                  onChange={(endDate) => setFormData({ ...formData, endDate })}
                  disabled={formData.isCurrent}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.isCurrent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isCurrent: e.target.checked,
                        endDate: e.target.checked ? '' : formData.endDate,
                      })
                    }
                  />{' '}
                  Currently work here
                </label>
                <label className="text-sm font-medium md:col-span-2">
                  Relevant responsibilities (optional)
                  <textarea
                    aria-label="Relevant responsibilities"
                    rows={3}
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    className="field-control"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button disabled={busy} className="btn-primary">
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save role'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {!employmentList.length && (
              <EmptyState
                icon={Briefcase}
                title="No employment history"
                description="Add a role when it is relevant to the vacancies you plan to apply for."
              />
            )}
            {employmentList.map((employment) => (
              <article key={employment.id} className="section-panel flex items-start gap-4">
                <div className="rounded-full bg-brand-50 p-3 text-brand-700">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-stone-950">{employment.jobTitle}</h2>
                  <p className="text-sm text-stone-600">
                    {employment.employer} • {employment.country}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {new Date(employment.startDate).toLocaleDateString()} –{' '}
                    {employment.isCurrent
                      ? 'Present'
                      : employment.endDate
                        ? new Date(employment.endDate).toLocaleDateString()
                        : 'Not specified'}
                  </p>
                  {employment.responsibilities && (
                    <p className="mt-3 border-l-2 border-stone-200 pl-4 text-sm leading-6 text-stone-700">
                      {employment.responsibilities}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label={`Edit ${employment.jobTitle} at ${employment.employer}`}
                    type="button"
                    onClick={() => openEdit(employment)}
                    className="btn-icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Delete ${employment.jobTitle} at ${employment.employer}`}
                    type="button"
                    onClick={() => setDeleteTarget(employment)}
                    className="btn-icon text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => (deleteTarget ? remove(deleteTarget) : undefined)}
        title="Delete employment record"
        description={
          deleteTarget
            ? `Delete your ${deleteTarget.jobTitle} record at ${deleteTarget.employer}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete record"
        tone="danger"
        busy={busy}
      />
      <Footer />
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required ? ' *' : ''}
      <input
        aria-label={label}
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control disabled:bg-stone-100"
      />
    </label>
  )
}
