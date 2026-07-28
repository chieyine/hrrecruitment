'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Plus, Briefcase, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'

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
  supervisorName: string | null
  supervisorEmail: string | null
  supervisorPhone: string | null
  state: string | null
  location: string | null
  reasonForLeaving: string | null
  permissionToContact: boolean
}

const emptyForm = {
  employer: '',
  jobTitle: '',
  employmentType: 'FULL_TIME',
  country: 'Nigeria',
  startDate: '',
  endDate: '',
  isCurrent: false,
  responsibilities: '',
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
  state: '',
  location: '',
  reasonForLeaving: '',
  permissionToContact: true,
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
      supervisorName: employment.supervisorName ?? '',
      supervisorEmail: employment.supervisorEmail ?? '',
      supervisorPhone: employment.supervisorPhone ?? '',
      state: employment.state ?? '',
      location: employment.location ?? '',
      reasonForLeaving: employment.reasonForLeaving ?? '',
      permissionToContact: employment.permissionToContact,
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
    const response = await fetch(`/api/candidate/employment/${employment.id}`, { method: 'DELETE' })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Unable to delete employment record')
    else {
      setMessage('Employment record deleted.')
      await loadData()
      setDeleteTarget(null)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link aria-label="Back to profile" href="/candidate/profile" className="rounded-lg border bg-white p-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Employment</h1>
              <p className="text-sm text-slate-600">Add your work experience.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Add Experience
          </button>
        </div>

        {message && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        {showForm && (
          <form onSubmit={save} className="mb-6 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Employment Record' : 'Add Employment Record'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Employer / Organization"
                value={formData.employer}
                onChange={(employer) => setFormData({ ...formData, employer })}
                required
              />
              <Field
                label="Job Title"
                value={formData.jobTitle}
                onChange={(jobTitle) => setFormData({ ...formData, jobTitle })}
                required
              />
              <label className="text-sm font-medium">
                Employment Type
                <select
                  aria-label="Employment Type"
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="mt-1 w-full rounded-lg border p-2.5"
                >
                  {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONSULTANCY', 'INTERNSHIP', 'VOLUNTEER'].map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Employment Country"
                value={formData.country}
                onChange={(country) => setFormData({ ...formData, country })}
                required
              />
              <Field label="State" value={formData.state} onChange={(state) => setFormData({ ...formData, state })} />
              <Field
                label="City / Location"
                value={formData.location}
                onChange={(location) => setFormData({ ...formData, location })}
              />
              <Field
                label="Employment Start Date"
                type="date"
                value={formData.startDate}
                onChange={(startDate) => setFormData({ ...formData, startDate })}
                required
              />
              <Field
                label="Employment End Date"
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
              <Field
                label="Supervisor Name"
                value={formData.supervisorName}
                onChange={(supervisorName) => setFormData({ ...formData, supervisorName })}
              />
              <Field
                label="Supervisor Email"
                type="email"
                value={formData.supervisorEmail}
                onChange={(supervisorEmail) => setFormData({ ...formData, supervisorEmail })}
              />
              <Field
                label="Supervisor Phone"
                value={formData.supervisorPhone}
                onChange={(supervisorPhone) => setFormData({ ...formData, supervisorPhone })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.permissionToContact}
                  onChange={(event) => setFormData({ ...formData, permissionToContact: event.target.checked })}
                />{' '}
                FRAD may contact this supervisor
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Key Responsibilities
                <textarea
                  aria-label="Key Responsibilities"
                  rows={3}
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Reason for Leaving
                <textarea
                  aria-label="Reason for Leaving"
                  rows={2}
                  value={formData.reasonForLeaving}
                  onChange={(event) => setFormData({ ...formData, reasonForLeaving: event.target.value })}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : editingId ? 'Update Experience' : 'Save Experience'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!employmentList.length && (
            <div className="rounded-xl border bg-white p-8 text-center text-slate-500">No work history added yet.</div>
          )}
          {employmentList.map((employment) => (
            <article key={employment.id} className="flex items-start gap-4 rounded-xl border bg-white p-6 shadow-sm">
              <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">{employment.jobTitle}</h3>
                <p className="text-sm text-slate-600">
                  {employment.employer} • {employment.country}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(employment.startDate).toLocaleDateString()} –{' '}
                  {employment.isCurrent
                    ? 'Present'
                    : employment.endDate
                      ? new Date(employment.endDate).toLocaleDateString()
                      : 'Not specified'}
                </p>
                {employment.responsibilities && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{employment.responsibilities}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  aria-label={`Edit ${employment.jobTitle} at ${employment.employer}`}
                  type="button"
                  onClick={() => openEdit(employment)}
                  className="rounded-lg border p-2 text-brand-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Delete ${employment.jobTitle} at ${employment.employer}`}
                  type="button"
                  onClick={() => setDeleteTarget(employment)}
                  className="rounded-lg border p-2 text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
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
        className="mt-1 w-full rounded-lg border p-2.5 disabled:bg-slate-100"
      />
    </label>
  )
}
