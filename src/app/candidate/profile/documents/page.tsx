'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Trash2, Pencil, Download, CalendarClock } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

/**
 * Fallback categories used only if the configured DocumentType list is empty or
 * cannot be read, so the upload form is never unusable.
 */
const DEFAULT_DOCUMENT_TYPES = [
  { code: 'CV', name: 'Curriculum Vitae (CV)' },
  { code: 'COVER_LETTER', name: 'Cover Letter' },
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
  const [loading, setLoading] = useState(true)

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
    setLoading(true)
    fetch('/api/candidate/profile')
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Unable to load your documents.')
        return body
      })
      .then((data) => {
        setDocuments(data.profile?.documents ?? [])
        setError('')
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load your documents.'))
      .finally(() => setLoading(false))
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload the document.')
    } finally {
      setUploading(false)
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
            title="Document library"
            description="Keep reusable application files here. FRAD will ask separately for identity or pre-employment documents when they are needed."
            actions={
              <button onClick={() => setShowUpload(!showUpload)} className="btn-primary">
                <Upload className="h-4 w-4" /> Upload a file
              </button>
            }
          />

          {showUpload && (
            <form onSubmit={handleUpload} className="section-panel space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-950">Upload a file</h2>
                <p className="mt-1 text-sm text-stone-600">Choose the category that describes this file.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="document-category" className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="document-category"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="field-control"
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
                    className="mt-1 w-full text-sm text-stone-600 file:mr-3 file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800"
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    PDF, JPG, PNG or Word. The category may have a lower size limit.
                  </p>
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
                    className="field-control"
                  />
                </div>
              </div>

              {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading ? 'Uploading…' : 'Save file'}
                </button>
              </div>
            </form>
          )}

          {editingDoc && (
            <form onSubmit={editDoc} className="section-panel space-y-4">
              <h2 className="text-lg font-bold">Edit document</h2>
              <p className="text-sm text-slate-600">{editingDoc.fileAsset?.originalName}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Category
                  <select
                    aria-label="Edit Document Category"
                    value={editDocumentType}
                    onChange={(event) => setEditDocumentType(event.target.value)}
                    className="field-control"
                  >
                    {(documentTypes.length === 0 ? DEFAULT_DOCUMENT_TYPES : documentTypes).map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Expiry date
                  <input
                    aria-label="Edit Document Expiry Date"
                    type="date"
                    value={editExpiryDate}
                    onChange={(event) => setEditExpiryDate(event.target.value)}
                    className="field-control"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingDoc(null)} className="btn-secondary">
                  Cancel
                </button>
                <button disabled={uploading} className="btn-primary">
                  Save changes
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {loading ? (
              <div role="status" className="section-panel p-10 text-center text-sm text-stone-500">
                Loading your files…
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No reusable files"
                description="Upload a CV or another file when you want to use it in an application."
              />
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="section-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-brand-50 p-3 text-brand-700">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-950">
                        {(documentTypes.length === 0 ? DEFAULT_DOCUMENT_TYPES : documentTypes).find(
                          (type) => type.code === doc.documentType
                        )?.name || doc.documentType.replaceAll('_', ' ')}
                      </h2>
                      <p className="text-sm text-stone-600">{doc.fileAsset?.originalName || 'Stored file'}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.expiryDate && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                          <CalendarClock className="h-3.5 w-3.5" /> Expires{' '}
                          {new Date(doc.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/api/assets/download/${doc.fileAssetId}`} className="btn-secondary">
                      <Download className="h-4 w-4" /> Open
                    </a>
                    <button
                      type="button"
                      aria-label={`Edit ${doc.fileAsset?.originalName || doc.documentType}`}
                      onClick={() => {
                        setEditingDoc(doc)
                        setEditDocumentType(doc.documentType)
                        setEditExpiryDate(doc.expiryDate ? new Date(doc.expiryDate).toISOString().slice(0, 10) : '')
                      }}
                      className="btn-icon"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.fileAsset?.originalName || doc.documentType}`}
                      onClick={() => setDeletingDoc(doc)}
                      className="btn-icon text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <ConfirmDialog
        open={deletingDoc !== null}
        onClose={() => setDeletingDoc(null)}
        onConfirm={() => {
          if (deletingDoc) return deleteDoc(deletingDoc)
        }}
        title="Delete document"
        description="Remove this document from your profile? Copies already included in submitted applications will not be removed."
        confirmLabel="Delete"
        tone="danger"
      />
      <Footer />
    </div>
  )
}
