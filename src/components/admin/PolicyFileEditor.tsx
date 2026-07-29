'use client'

import { useState } from 'react'
import { FileCheck2, Loader2, Upload } from 'lucide-react'

export default function PolicyFileEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setError('')
    if (file.type !== 'application/pdf') {
      setError('Choose a PDF file.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('sensitivityClass', 'CONFIDENTIAL')
      const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The policy PDF could not be uploaded.')
      onChange(body.fileAssetId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The policy PDF could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {value && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          <FileCheck2 className="h-4 w-4" /> Official PDF attached
        </div>
      )}
      <label className="btn-secondary w-fit cursor-pointer">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {value ? 'Replace PDF' : 'Upload official PDF'}
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.target.value = ''
          }}
        />
      </label>
      <p className="text-xs leading-5 text-stone-500">
        Upload the approved PDF candidates must read. The assigned file is frozen with each preboarding record.
      </p>
      {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
    </div>
  )
}
