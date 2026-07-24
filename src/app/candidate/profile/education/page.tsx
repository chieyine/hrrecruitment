'use client'

import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Plus, GraduationCap, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/Dialog'

type Education = {
  id: string
  institution: string
  qualification: string
  fieldOfStudy: string
  country: string
  startYear: number
  completionYear: number
  grade: string | null
  certificateFileId: string | null
}

const emptyForm = {
  institution: '',
  qualification: 'Bachelor Degree',
  fieldOfStudy: '',
  country: 'Nigeria',
  startYear: '2018',
  completionYear: '2022',
  grade: '',
  certificateFileId: '',
}

export default function CandidateEducationPage() {
  const [educationList, setEducationList] = useState<Education[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Education | null>(null)
  const [certificate, setCertificate] = useState<File | null>(null)

  const loadData = useCallback(async () => {
    const response = await fetch('/api/candidate/profile')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Unable to load education history')
    setEducationList(body.profile?.education ?? [])
  }, [])

  useEffect(() => {
    void loadData().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load education history'))
  }, [loadData])

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  const openEdit = (education: Education) => {
    setEditingId(education.id)
    setFormData({
      institution: education.institution,
      qualification: education.qualification,
      fieldOfStudy: education.fieldOfStudy,
      country: education.country,
      startYear: String(education.startYear),
      completionYear: String(education.completionYear),
      grade: education.grade ?? '',
      certificateFileId: education.certificateFileId ?? '',
    })
    setError('')
    setMessage('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      let certificateFileId = formData.certificateFileId || undefined
      if (certificate) {
        const uploadData = new FormData()
        uploadData.append('file', certificate)
        uploadData.append('sensitivityClass', 'CONFIDENTIAL')
        const upload = await fetch('/api/assets/upload', { method: 'POST', body: uploadData })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.error || 'Unable to upload certificate')
        certificateFileId = uploaded.fileAssetId
      }
      const response = await fetch(editingId ? `/api/candidate/education/${editingId}` : '/api/candidate/education', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, certificateFileId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save education record')
      setMessage(editingId ? 'Education record updated.' : 'Education record added.')
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)
      setCertificate(null)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save education record')
    } finally {
      setBusy(false)
    }
  }

  const deleteEducation = async (education: Education) => {
    setBusy(true)
    setError('')
    const response = await fetch(`/api/candidate/education/${education.id}`, { method: 'DELETE' })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Unable to delete education record')
    else {
      setMessage('Education record deleted.')
      await loadData()
      setDeleteTarget(null)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link aria-label="Back to profile" href="/candidate/profile" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Education</h1>
              <p className="text-slate-600 text-sm">Add your qualifications.</p>
            </div>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Add Education
          </button>
        </div>

        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">{editingId ? 'Edit Academic Record' : 'Add Academic Record'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Institution Name *
                <input aria-label="Institution Name" required value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">Qualification *
                <select aria-label="Qualification" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2">
                  {['Doctorate (PhD)', 'Master Degree', 'Bachelor Degree', 'Higher National Diploma (HND)', 'Ordinary National Diploma (OND)', 'SSCE / O-Level'].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Field of Study *
                <input aria-label="Field of Study" required value={formData.fieldOfStudy} onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">Country *
                <input aria-label="Education Country" required value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">Start Year *
                <input aria-label="Education Start Year" required type="number" min="1900" max="2100" value={formData.startYear} onChange={(e) => setFormData({ ...formData, startYear: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">Completion Year *
                <input aria-label="Education Completion Year" required type="number" min="1900" max="2100" value={formData.completionYear} onChange={(e) => setFormData({ ...formData, completionYear: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Grade
                <input aria-label="Grade" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Qualification certificate
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setCertificate(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                {formData.certificateFileId && !certificate && <span className="mt-1 block text-xs font-normal text-emerald-700">Certificate already attached. Choose a file only to replace it.</span>}
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : editingId ? 'Update Record' : 'Save Record'}</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!educationList.length && <div className="bg-white p-8 rounded-xl border text-center text-slate-500">No education records added yet.</div>}
          {educationList.map((education) => (
            <article key={education.id} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><GraduationCap className="w-6 h-6" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{education.qualification} in {education.fieldOfStudy}</h3>
                <p className="text-slate-600 text-sm">{education.institution} • {education.country}</p>
                <p className="mt-1 text-xs text-slate-500">{education.startYear} – {education.completionYear}{education.grade ? ` • Grade: ${education.grade}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button aria-label={`Edit ${education.institution}`} type="button" onClick={() => openEdit(education)} className="rounded-lg border p-2 text-blue-700"><Pencil className="h-4 w-4" /></button>
                <button aria-label={`Delete ${education.institution}`} type="button" disabled={busy} onClick={() => setDeleteTarget(education)} className="rounded-lg border p-2 text-rose-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget ? deleteEducation(deleteTarget) : undefined} title="Delete education record" description={deleteTarget ? `Delete ${deleteTarget.qualification} at ${deleteTarget.institution}? This cannot be undone.` : ''} confirmLabel="Delete record" tone="danger" busy={busy} />
      <Footer />
    </div>
  )
}
