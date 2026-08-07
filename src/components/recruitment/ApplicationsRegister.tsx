'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AssistedApplicationEntry from '@/components/admin/AssistedApplicationEntry'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import BulkApplicationActions from '@/components/admin/BulkApplicationActions'
import Pagination, { type PageMeta } from '@/components/ui/Pagination'
import { APPLICATION_STAGES } from '@/lib/application-stages'

export default function ApplicationsRegister({
  initialVacancyId,
  canManage,
}: {
  initialVacancyId: string
  canManage: boolean
}) {
  const vacancyId = initialVacancyId
  const [applications, setApplications] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Filtering and paging now happen on the server: filtering only the rows of
  // the current page client-side would quietly hide matches on other pages.
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [status])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (status !== 'ALL') params.set('status', status)
    if (vacancyId) params.set('vacancyId', vacancyId)

    fetch(`/api/recruitment/applications?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load applications.')
        setApplications(body.applications || [])
        setMeta({
          page: body.page,
          pageSize: body.pageSize,
          total: body.total,
          totalPages: body.totalPages,
          hasMore: body.hasMore,
        })
        setError('')
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not load applications.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [page, pageSize, debouncedSearch, status, vacancyId])

  // The full stage list, not just the stages present on the current page.
  const statuses = APPLICATION_STAGES.filter((stage) => stage !== 'DRAFT')
  // The server has already filtered and paged; these are the rows to render.
  const filtered = applications
  const selectedApplications = applications
    .filter((application) => selectedIds.includes(application.id))
    .map((application) => ({
      id: application.id,
      candidate:
        application.candidate?.alias ||
        `${application.candidate?.legalFirstName || ''} ${application.candidate?.lastName || ''}`.trim(),
      vacancy: application.vacancy?.referenceNumber || '',
      status: application.internalStatus,
    }))
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((application) => selectedIds.includes(application.id))

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell space-y-7">
          <PageIntro
            eyebrow="Recruitment"
            title="Applications"
            description="Find an application, check its stage and open the candidate record."
          />
          {vacancyId && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
              <span>Showing applications for one vacancy.</span>
              <div className="flex gap-3">
                <Link
                  href={`/recruitment/vacancies/${vacancyId}`}
                  className="font-semibold underline underline-offset-4"
                >
                  Open vacancy
                </Link>
                <Link href="/recruitment/applications" className="font-semibold underline underline-offset-4">
                  Show all
                </Link>
              </div>
            </div>
          )}

          <section className="section-panel">
            <div className="grid gap-3 border-b border-stone-200 p-4 sm:grid-cols-[1fr_220px]">
              <label className="relative">
                <span className="sr-only">Search applications</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="search"
                  placeholder="Candidate, email, vacancy or reference"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="field-control pl-9"
                />
              </label>
              <label>
                <span className="sr-only">Application stage</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="field-control">
                  <option value="ALL">All stages</option>
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 text-xs text-stone-500">
              <span>
                {(meta?.total ?? filtered.length).toLocaleString('en-GB')} application
                {(meta?.total ?? filtered.length) === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-3">
                {(search || status !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearch('')
                      setStatus('ALL')
                    }}
                    className="font-semibold text-brand-800 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            {canManage && selectedApplications.length > 0 && (
              <BulkApplicationActions applications={selectedApplications} onClear={() => setSelectedIds([])} />
            )}

            {error ? (
              <p role="alert" className="m-4 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </p>
            ) : loading ? (
              <p className="p-10 text-center text-sm text-stone-500">Loading applications…</p>
            ) : filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Users}
                  title={
                    applications.length ? 'No applications match these filters' : 'No applications have been submitted'
                  }
                  description={
                    applications.length
                      ? 'Clear a filter or try a different name, email or vacancy reference.'
                      : 'Submitted applications will appear here.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[800px]">
                  <thead>
                    <tr>
                      {canManage && (
                        <th className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all visible applications"
                            checked={allVisibleSelected}
                            onChange={(event) =>
                              setSelectedIds(
                                event.target.checked
                                  ? [...new Set([...selectedIds, ...filtered.map((application) => application.id)])]
                                  : selectedIds.filter((id) => !filtered.some((application) => application.id === id))
                              )
                            }
                          />
                        </th>
                      )}
                      <th>Candidate</th>
                      <th>Vacancy</th>
                      <th>Submitted</th>
                      <th>Stage</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((application) => (
                      <tr key={application.id}>
                        {canManage && (
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${
                                application.candidate?.alias ||
                                `${application.candidate?.legalFirstName ?? ''} ${application.candidate?.lastName ?? ''}`.trim()
                              }`}
                              checked={selectedIds.includes(application.id)}
                              onChange={(event) =>
                                setSelectedIds(
                                  event.target.checked
                                    ? [...selectedIds, application.id]
                                    : selectedIds.filter((id) => id !== application.id)
                                )
                              }
                            />
                          </td>
                        )}
                        <td>
                          {/* §28.3 An anonymised vacancy sends an alias instead
                              of a name; the identifying fields arrive empty. */}
                          <span className="font-bold text-stone-900">
                            {application.candidate?.anonymised
                              ? application.candidate.alias
                              : `${application.candidate?.legalFirstName ?? ''} ${application.candidate?.lastName ?? ''}`.trim()}
                          </span>
                          {application.candidate?.anonymised ? (
                            <span className="mt-1 block text-xs font-medium text-sky-800">
                              Anonymised for this stage
                            </span>
                          ) : (
                            application.candidate?.user?.email && (
                              <span className="mt-1 block text-xs text-stone-500">
                                {application.candidate.user.email}
                              </span>
                            )
                          )}
                        </td>
                        <td>
                          <span className="font-semibold text-stone-900">
                            {application.vacancy?.title || 'Vacancy'}
                          </span>
                          {application.vacancy?.referenceNumber && (
                            <span className="mt-1 block font-mono text-xs text-stone-500">
                              {application.vacancy.referenceNumber}
                            </span>
                          )}
                        </td>
                        <td>{new Date(application.submittedAt || application.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className="status-chip border-stone-200 bg-stone-50 text-stone-700">
                            {application.internalStatus.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/recruitment/applications/${application.id}`}
                            className="text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4"
                          >
                            Open record
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              meta={meta}
              busy={loading}
              label="applications"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </section>
          {canManage && <AssistedApplicationEntry />}
        </div>
      </main>
      <Footer />
    </div>
  )
}
