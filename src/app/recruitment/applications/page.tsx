'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AssistedApplicationEntry from '@/components/admin/AssistedApplicationEntry'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import BulkApplicationActions from '@/components/admin/BulkApplicationActions'

type SavedView = { id: string; name: string; search: string; status: string }

export default function MasterApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [views, setViews] = useState<SavedView[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [viewName, setViewName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    try {
      setViews(JSON.parse(localStorage.getItem('frad-application-views') || '[]'))
      const preferences = JSON.parse(localStorage.getItem('frad-application-table') || '{}')
      if (preferences.search) setSearch(preferences.search)
      if (preferences.status) setStatus(preferences.status)
      setCompact(Boolean(preferences.compact))
    } catch {}
    fetch('/api/recruitment/applications')
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load applications.')
        setApplications(body.applications || [])
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load applications.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem('frad-application-table', JSON.stringify({ search, status, compact }))
  }, [search, status, compact])

  const statuses = useMemo(() => [...new Set(applications.map((application) => application.internalStatus))].sort(), [applications])
  const filtered = useMemo(() => applications.filter((application) => {
    if (status !== 'ALL' && application.internalStatus !== status) return false
    const haystack = `${application.candidate?.legalFirstName || ''} ${application.candidate?.lastName || ''} ${application.candidate?.user?.email || ''} ${application.vacancy?.title || ''} ${application.vacancy?.referenceNumber || ''}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  }), [applications, search, status])
  const selectedApplications = applications.filter((application) => selectedIds.includes(application.id)).map((application) => ({
    id: application.id,
    candidate: `${application.candidate?.legalFirstName || ''} ${application.candidate?.lastName || ''}`.trim(),
    vacancy: application.vacancy?.referenceNumber || '',
    status: application.internalStatus,
  }))
  const allVisibleSelected = filtered.length > 0 && filtered.every((application) => selectedIds.includes(application.id))

  function saveView() {
    const next = [...views, { id: crypto.randomUUID(), name: viewName.trim(), search, status }]
    setViews(next)
    localStorage.setItem('frad-application-views', JSON.stringify(next))
    setViewName('')
    setSaveOpen(false)
  }

  function removeView(id: string) {
    const next = views.filter((view) => view.id !== id)
    setViews(next)
    localStorage.setItem('frad-application-views', JSON.stringify(next))
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell space-y-7">
          <PageIntro eyebrow="Recruitment" title="Applications" description="Find an application, check its stage and open the candidate record." />

          {views.length > 0 && (
            <section aria-label="Saved application views" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold text-stone-500">Saved views</span>
              {views.map((view) => <span key={view.id} className="inline-flex overflow-hidden rounded-full border border-stone-300 bg-white"><button onClick={() => { setSearch(view.search); setStatus(view.status) }} className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">{view.name}</button><button aria-label={`Remove saved view ${view.name}`} onClick={() => removeView(view.id)} className="border-l border-stone-200 px-2 text-stone-400 hover:text-rose-700">×</button></span>)}
            </section>
          )}

          <section className="section-panel">
            <div className="grid gap-3 border-b border-stone-200 p-4 sm:grid-cols-[1fr_220px_auto]">
              <label className="relative">
                <span className="sr-only">Search applications</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input type="search" placeholder="Candidate, email, vacancy or reference" value={search} onChange={(event) => setSearch(event.target.value)} className="field-control pl-9" />
              </label>
              <label>
                <span className="sr-only">Application stage</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="field-control">
                  <option value="ALL">All stages</option>
                  {statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setSaveOpen(true)} className="btn-secondary">Save view</button>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 text-xs text-stone-500">
              <span>{filtered.length} application{filtered.length === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-3"><button onClick={() => setCompact(!compact)} className="font-semibold text-brand-800 underline">{compact ? 'Comfortable rows' : 'Compact rows'}</button>{(search || status !== 'ALL') && <button onClick={() => { setSearch(''); setStatus('ALL') }} className="font-semibold text-brand-800 underline">Clear filters</button>}</div>
            </div>
            {selectedApplications.length > 0 && <BulkApplicationActions applications={selectedApplications} onClear={() => setSelectedIds([])} />}

            {error ? <p role="alert" className="m-4 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : loading ? <p className="p-10 text-center text-sm text-stone-500">Loading applications…</p> : filtered.length === 0 ? (
              <div className="p-4"><EmptyState icon={Users} title={applications.length ? 'No applications match these filters' : 'No applications have been submitted'} description={applications.length ? 'Clear a filter or try a different name, email or vacancy reference.' : 'Submitted applications will appear here.'} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[800px]">
                  <thead><tr><th className="w-10"><input type="checkbox" aria-label="Select all visible applications" checked={allVisibleSelected} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...filtered.map((application) => application.id)])] : selectedIds.filter((id) => !filtered.some((application) => application.id === id)))} /></th><th>Candidate</th><th>Vacancy</th><th>Submitted</th><th>Stage</th><th><span className="sr-only">Open</span></th></tr></thead>
                  <tbody>
                    {filtered.map((application) => (
                      <tr key={application.id} className={compact ? '[&>td]:!py-2' : ''}>
                        <td><input type="checkbox" aria-label={`Select ${application.candidate?.legalFirstName} ${application.candidate?.lastName}`} checked={selectedIds.includes(application.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, application.id] : selectedIds.filter((id) => id !== application.id))} /></td>
                        <td><span className="font-bold text-stone-900">{application.candidate?.legalFirstName} {application.candidate?.lastName}</span>{application.candidate?.user?.email && <span className="mt-1 block text-xs text-stone-500">{application.candidate.user.email}</span>}</td>
                        <td><span className="font-semibold text-stone-900">{application.vacancy?.title || 'Vacancy'}</span>{application.vacancy?.referenceNumber && <span className="mt-1 block font-mono text-xs text-stone-500">{application.vacancy.referenceNumber}</span>}</td>
                        <td>{new Date(application.submittedAt || application.createdAt).toLocaleDateString()}</td>
                        <td><span className="status-chip border-stone-200 bg-stone-50 text-stone-700">{application.internalStatus.replaceAll('_', ' ')}</span></td>
                        <td className="text-right"><Link href={`/recruitment/applications/${application.id}`} className="text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4">Open record</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <AssistedApplicationEntry />
        </div>
      </main>
      <Footer />

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save this application view">
        <form onSubmit={(event) => { event.preventDefault(); saveView() }} className="space-y-4">
          <p className="text-sm text-stone-600">This view stores the current search and stage filter in this browser.</p>
          <label className="block"><span className="field-label">View name</span><input required minLength={2} value={viewName} onChange={(event) => setViewName(event.target.value)} className="field-control" placeholder="For example: New finance applications" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setSaveOpen(false)} className="btn-secondary">Cancel</button><button className="btn-primary">Save view</button></div>
        </form>
      </Dialog>
    </div>
  )
}
