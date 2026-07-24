'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Plus, Award, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'

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

const emptyForm = { professionalBody: '', licenceType: '', licenceNumber: '', issueDate: '', expiryDate: '', evidenceFileId: '' }
const dateValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''

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

  const loadData = useCallback(async () => {
    const response = await fetch('/api/candidate/profile')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Unable to load licences')
    setLicences(body.profile?.licences ?? [])
  }, [])
  useEffect(() => { void loadData().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load licences')) }, [loadData])

  const openAdd = () => {
    setEditingId(null); setFormData(emptyForm); setShowForm(true); setMessage(''); setError('')
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
    setShowForm(true); setMessage(''); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let evidenceFileId = formData.evidenceFileId || undefined
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
      setEditingId(null); setFormData(emptyForm); setEvidence(null); setShowForm(false)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save licence')
    } finally { setBusy(false) }
  }

  const remove = async (licence: Licence) => {
    setBusy(true); setError('')
    const response = await fetch(`/api/candidate/licences/${licence.id}`, { method: 'DELETE' })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Unable to delete licence')
    else { setMessage('Licence deleted.'); await loadData(); setDeleteTarget(null) }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link aria-label="Back to profile" href="/candidate/profile" className="rounded-lg border bg-white p-2"><ArrowLeft className="h-4 w-4" /></Link>
            <div><h1 className="text-2xl font-bold">Licences and memberships</h1><p className="text-sm text-slate-600">Add professional licences and memberships.</p></div>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Add Licence</button>
        </div>

        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {showForm && (
          <form onSubmit={save} className="mb-6 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Professional Licence' : 'Add Professional Licence'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Professional Body" value={formData.professionalBody} onChange={(professionalBody) => setFormData({ ...formData, professionalBody })} required />
              <Field label="Licence / Membership Type" value={formData.licenceType} onChange={(licenceType) => setFormData({ ...formData, licenceType })} required />
              <Field label="Licence Number" value={formData.licenceNumber} onChange={(licenceNumber) => setFormData({ ...formData, licenceNumber })} required />
              <Field label="Licence Issue Date" type="date" value={formData.issueDate} onChange={(issueDate) => setFormData({ ...formData, issueDate })} required />
              <Field label="Licence Expiry Date" type="date" value={formData.expiryDate} onChange={(expiryDate) => setFormData({ ...formData, expiryDate })} />
              <label className="text-sm font-medium md:col-span-2">Licence or membership evidence
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setEvidence(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                {formData.evidenceFileId && !evidence && <span className="mt-1 block text-xs font-normal text-emerald-700">Evidence already attached. Choose a file only to replace it.</span>}
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm">Cancel</button>
              <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : editingId ? 'Update Licence' : 'Save Licence'}</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!licences.length && <div className="rounded-xl border bg-white p-8 text-center text-slate-500">No professional licences added yet.</div>}
          {licences.map((licence) => (
            <article key={licence.id} className="flex items-start gap-4 rounded-xl border bg-white p-6 shadow-sm">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600"><Award className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">{licence.licenceType}</h3>
                <p className="text-sm text-slate-600">{licence.professionalBody}</p>
                <p className="mt-1 text-xs text-slate-500">Reg No: {licence.licenceNumber} • {licence.verificationStatus}</p>
              </div>
              <div className="flex gap-2">
                <button aria-label={`Edit licence ${licence.licenceNumber}`} type="button" onClick={() => openEdit(licence)} className="rounded-lg border p-2 text-blue-700"><Pencil className="h-4 w-4" /></button>
                <button aria-label={`Delete licence ${licence.licenceNumber}`} type="button" onClick={() => setDeleteTarget(licence)} className="rounded-lg border p-2 text-rose-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget ? remove(deleteTarget) : undefined} title="Delete licence" description={deleteTarget ? `Delete licence ${deleteTarget.licenceNumber}? This cannot be undone.` : ''} confirmLabel="Delete licence" tone="danger" busy={busy} />
      <Footer />
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm font-medium">{label}{required ? ' *' : ''}
    <input aria-label={label} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />
  </label>
}
