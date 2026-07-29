'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Plus, Award, Pencil, Trash2, CheckCircle2, FileCheck2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

type Licence = {
  id: string
  professionalBody: string
  licenceType: string
  licenceNumber: string
  issueDate: string
  expiryDate: string | null
  verificationStatus: string
  evidenceFileId: string | null
}

const emptyForm = {
  professionalBody: '',
  licenceType: '',
  licenceNumber: '',
  issueDate: '',
  expiryDate: '',
  evidenceFileId: '',
}
const dateValue = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export default function CandidateLicencesPage() {
  const [licences, setLicences] = useState<Licence[]>([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Licence | null>(null)
  const [evidence, setEvidence] = useState<File | null>(null)
  const [removeEvidence, setRemoveEvidence] = useState(false)

  const loadData = useCallback(async () => {
    const response = await fetch('/api/candidate/profile')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Unable to load licences')
    setLicences(body.profile?.licences ?? [])
  }, [])
  useEffect(() => {
    void loadData().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load licences'))
  }, [loadData])

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setEvidence(null)
    setRemoveEvidence(false)
    setShowForm(true)
    setEvidence(null)
    setRemoveEvidence(false)
    setMessage('')
    setError('')
  }
  const openEdit = (licence: Licence) => {
    setEditingId(licence.id)
    setFormData({
      professionalBody: licence.professionalBody,
      licenceType: licence.licenceType,
      licenceNumber: licence.licenceNumber,
      issueDate: dateValue(licence.issueDate),
      expiryDate: dateValue(licence.expiryDate),
      evidenceFileId: licence.evidenceFileId ?? '',
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
      let evidenceFileId: string | null | undefined = removeEvidence ? null : formData.evidenceFileId || undefined
      if (evidence) {
        const uploadData = new FormData()
        uploadData.append('file', evidence)
        uploadData.append('sensitivityClass', 'CONFIDENTIAL')
        const upload = await fetch('/api/assets/upload', { method: 'POST', body: uploadData })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.error || 'Unable to upload licence evidence')
        evidenceFileId = uploaded.fileAssetId
      }
      const response = await fetch(editingId ? `/api/candidate/licences/${editingId}` : '/api/candidate/licences', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, expiryDate: formData.expiryDate || undefined, evidenceFileId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save licence')
      setMessage(editingId ? 'Licence updated.' : 'Licence added.')
      setEditingId(null)
      setFormData(emptyForm)
      setEvidence(null)
      setShowForm(false)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save licence')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (licence: Licence) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/candidate/licences/${licence.id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to delete licence')
      setMessage('Licence deleted.')
      await loadData()
      setDeleteTarget(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete licence')
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
            title="Professional licences"
            description="Add a current registration or licence when it is required for the work you do."
            actions={
              <button type="button" onClick={openAdd} className="btn-primary">
                <Plus className="h-4 w-4" /> Add a licence
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
            <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}

          {showForm && (
            <form onSubmit={save} className="section-panel space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-950">{editingId ? 'Edit licence' : 'Add a licence'}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Use the details issued by the regulator or professional body.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Regulator or professional body"
                  value={formData.professionalBody}
                  onChange={(professionalBody) => setFormData({ ...formData, professionalBody })}
                  required
                />
                <Field
                  label="Licence or registration"
                  value={formData.licenceType}
                  onChange={(licenceType) => setFormData({ ...formData, licenceType })}
                  required
                />
                <Field
                  label="Registration or licence number"
                  value={formData.licenceNumber}
                  onChange={(licenceNumber) => setFormData({ ...formData, licenceNumber })}
                  required
                />
                <Field
                  label="Issue date"
                  type="date"
                  value={formData.issueDate}
                  onChange={(issueDate) => setFormData({ ...formData, issueDate })}
                  required
                />
                <Field
                  label="Expiry date (optional)"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(expiryDate) => setFormData({ ...formData, expiryDate })}
                />
                <label className="text-sm font-medium md:col-span-2">
                  Evidence (optional)
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(event) => {
                      setEvidence(event.target.files?.[0] || null)
                      if (event.target.files?.[0]) setRemoveEvidence(false)
                    }}
                    className="mt-1 block w-full text-sm"
                  />
                  {formData.evidenceFileId && !evidence && !removeEvidence && (
                    <span className="mt-2 flex flex-wrap items-center gap-3 text-xs font-normal">
                      <a
                        href={`/api/assets/download/${formData.evidenceFileId}`}
                        className="font-semibold text-brand-800 underline underline-offset-4"
                      >
                        View attached evidence
                      </a>
                      <button type="button" onClick={() => setRemoveEvidence(true)} className="text-rose-700 underline">
                        Remove evidence
                      </button>
                    </span>
                  )}
                  {removeEvidence && (
                    <span className="mt-2 block text-xs font-normal text-stone-600">
                      The evidence will be removed when you save.
                    </span>
                  )}
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button disabled={busy} className="btn-primary">
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save licence'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {!licences.length && (
              <EmptyState
                icon={Award}
                title="No professional licences"
                description="You can leave this blank unless a vacancy requires a registration or practising licence."
              />
            )}
            {licences.map((licence) => (
              <article key={licence.id} className="section-panel flex items-start gap-4">
                <div className="rounded-full bg-brand-50 p-3 text-brand-700">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-stone-950">{licence.licenceType}</h2>
                  <p className="text-sm text-stone-600">{licence.professionalBody}</p>
                  <p className="mt-1 text-xs font-medium text-stone-500">Registration {licence.licenceNumber}</p>
                  <p className="mt-2 text-xs text-stone-600">
                    Issued {new Date(licence.issueDate).toLocaleDateString()}
                    {licence.expiryDate ? ` · Expires ${new Date(licence.expiryDate).toLocaleDateString()}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                    {licence.evidenceFileId && (
                      <a
                        href={`/api/assets/download/${licence.evidenceFileId}`}
                        className="inline-flex items-center gap-1 text-brand-800 underline underline-offset-4"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" /> View evidence
                      </a>
                    )}
                    {licence.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Checked by FRAD
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label={`Edit licence ${licence.licenceNumber}`}
                    type="button"
                    onClick={() => openEdit(licence)}
                    className="btn-icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Delete licence ${licence.licenceNumber}`}
                    type="button"
                    onClick={() => setDeleteTarget(licence)}
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
        title="Delete licence"
        description={deleteTarget ? `Delete licence ${deleteTarget.licenceNumber}? This cannot be undone.` : ''}
        confirmLabel="Delete licence"
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required ? ' *' : ''}
      <input
        aria-label={label}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      />
    </label>
  )
}
