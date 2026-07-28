'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, CheckCircle, Trash2, Pencil } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ReasonDialog } from '@/components/ui/Dialog'

/**
 * Fallback categories used only if the configured DocumentType list is empty or
 * cannot be read, so the upload form is never unusable.
 */
const DEFAULT_DOCUMENT_TYPES = [
  { code: 'CV', name: 'Curriculum Vitae (CV)' },
  { code: 'COVER_LETTER', name: 'Cover Letter' },
  { code: 'ACADEMIC_CERTIFICATE', name: 'Academic Certificate' },
  { code: 'PROFESSIONAL_LICENCE', name: 'Professional Licence / Certificate' },
  { code: 'NYSC', name: 'NYSC Discharge / Exemption Certificate' },
  { code: 'PASSPORT_PHOTO', name: 'Passport Photograph' },
  { code: 'GUARANTOR_FORM', name: 'Guarantor Form' },
]

export default function CandidateDocumentLibraryPage() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [documentType, setDocumentType] = useState('CV')
  const [file, setFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [deletingDoc, setDeletingDoc] = useState<any | null>(null)
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  const [editDocumentType, setEditDocumentType] = useState('')
  // Categories are configured in /admin/document-types; hardcoding them meant
  // an administrator's changes never reached this form.
  const [documentTypes, setDocumentTypes] = useState<Array<{ code: string; name: string }>>([])

  useEffect(() => {
    fetch('/api/candidate/documents?types=1')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDocumentTypes(data?.documentTypes ?? []))
      .catch(() => setDocumentTypes([]))
  }, [])
  const [editExpiryDate, setEditExpiryDate] = useState('')

  const deleteDoc = async (doc: any) => {
    const response = await fetch(`/api/candidate/documents/${doc.id}`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast('error', data.error || 'Delete failed')
    } else {
      toast('success', 'Document removed.')
      setDeletingDoc(null)
      loadData()
    }
  }
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const editDoc = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingDoc) return
    setUploading(true)
    setError('')
    const response = await fetch(`/api/candidate/documents/${editingDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType: editDocumentType, expiryDate: editExpiryDate || null }),
    })
    const body = await response.json()
    if (!response.ok) setError(body.error || 'Unable to update document')
    else {
      toast('success', 'Document details updated.')
      setEditingDoc(null)
      loadData()
    }
    setUploading(false)
  }

  const loadData = () => {
    fetch('/api/candidate/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.documents) {
          setDocuments(data.profile.documents)
        }
      })
      .catch(console.error)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }
    setUploading(true)
    try {
      // 1) Upload the real file bytes.
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/assets/upload', { method: 'POST', body: fd })
      const upJson = await upRes.json()
      if (!upRes.ok) throw new Error(upJson.error || 'Upload failed')

      // 2) Link the stored asset into the document library.
      const docRes = await fetch('/api/candidate/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, fileAssetId: upJson.fileAssetId, expiryDate: expiryDate || undefined }),
      })
      const docJson = await docRes.json()
      if (!docRes.ok) throw new Error(docJson.error || 'Failed to save document')

      setShowUpload(false)
      setFile(null)
      setExpiryDate('')
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/candidate/profile"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
              <p className="text-slate-600 text-sm">Add CVs, cover letters, certificates and identity documents.</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {showUpload && (
          <form
            onSubmit={handleUpload}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4"
          >
            <h2 className="font-bold text-slate-900 text-lg">Upload Document</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="document-category" className="block text-sm font-medium text-slate-700 mb-1">
                  Document Category *
                </label>
                <select
                  id="document-category"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {documentTypes.length === 0
                    ? DEFAULT_DOCUMENT_TYPES.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.name}
                        </option>
                      ))
                    : documentTypes.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.name}
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label htmlFor="document-file" className="block text-sm font-medium text-slate-700 mb-1">
                  File *
                </label>
                <input
                  id="document-file"
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700"
                />
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG or Word. Max 10MB.</p>
              </div>
              <div>
                <label htmlFor="document-expiry" className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry date (if applicable)
                </label>
                <input
                  id="document-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Save Document'}
              </button>
            </div>
          </form>
        )}

        {editingDoc && (
          <form onSubmit={editDoc} className="mb-6 space-y-4 rounded-xl border border-brand-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Edit document</h2>
            <p className="text-sm text-slate-600">{editingDoc.fileAsset?.originalName}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Document Category
                <select
                  aria-label="Edit Document Category"
                  value={editDocumentType}
                  onChange={(event) => setEditDocumentType(event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5"
                >
                  {(documentTypes.length === 0 ? DEFAULT_DOCUMENT_TYPES : documentTypes).map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Document Expiry Date
                <input
                  aria-label="Edit Document Expiry Date"
                  type="date"
                  value={editExpiryDate}
                  onChange={(event) => setEditExpiryDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingDoc(null)} className="px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                disabled={uploading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              No documents added yet. Use “Upload document” to add one.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{doc.documentType}</h3>
                    <p className="text-slate-600 text-sm">{doc.fileAsset?.originalName || 'Document.pdf'}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                  <button
                    type="button"
                    aria-label={`Edit ${doc.fileAsset?.originalName || doc.documentType}`}
                    onClick={() => {
                      setEditingDoc(doc)
                      setEditDocumentType(doc.documentType)
                      setEditExpiryDate(doc.expiryDate ? new Date(doc.expiryDate).toISOString().slice(0, 10) : '')
                    }}
                    className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${doc.fileAsset?.originalName || doc.documentType}`}
                    onClick={() => setDeletingDoc(doc)}
                    className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <ReasonDialog
        open={deletingDoc !== null}
        onClose={() => setDeletingDoc(null)}
        onConfirm={() => {
          if (deletingDoc) return deleteDoc(deletingDoc)
        }}
        title="Delete document"
        description="Remove this document from your profile? Copies already included in submitted applications will not be removed."
        confirmLabel="Delete"
        reasonLabel="Note"
        tone="danger"
      />
      <Footer />
    </div>
  )
}
