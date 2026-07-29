import { Download, ExternalLink, FileCheck2 } from 'lucide-react'

export default function ControlledDocumentViewer({
  fileId,
  title,
  reference,
  issuedLabel,
}: {
  fileId: string
  title: string
  reference?: string
  issuedLabel?: string
}) {
  const downloadUrl = `/api/assets/download/${fileId}`
  const previewUrl = `${downloadUrl}?disposition=inline`

  return (
    <section aria-label={`${title} document`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-navy-900">{title}</h2>
            {(reference || issuedLabel) && (
              <p className="mt-0.5 text-xs text-stone-500">{[reference, issuedLabel].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="btn-secondary min-h-10 px-3 py-2 text-xs">
            <ExternalLink className="h-4 w-4" /> Open
          </a>
          <a href={downloadUrl} className="btn-secondary min-h-10 px-3 py-2 text-xs">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      </div>
      <div className="bg-stone-200/70 p-3 sm:p-5">
        <iframe
          title={`${title} PDF`}
          src={previewUrl}
          className="hidden h-[76vh] min-h-[640px] w-full rounded-lg border border-stone-300 bg-white shadow-sm sm:block"
        />
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center sm:hidden">
          <FileCheck2 className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-semibold text-navy-900">Your PDF is ready to read</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            Open it in your device’s document viewer for the clearest mobile experience.
          </p>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="btn-primary mt-4">
            Open document
          </a>
        </div>
      </div>
    </section>
  )
}
