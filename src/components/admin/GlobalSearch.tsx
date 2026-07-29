'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Search, UserRound } from 'lucide-react'

type ApplicationResult = {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  vacancy: string
  reference: string
  project: string | null
  department: string
  dutyStation: string
  erpPersonnelNumber: string | null
}

type VacancyResult = {
  id: string
  title: string
  reference: string
  status: string
  project: string | null
  department: string
  dutyStation: string
}

type SearchResults = {
  applications: ApplicationResult[]
  vacancies: VacancyResult[]
}

const EMPTY_RESULTS: SearchResults = { applications: [], vacancies: [] }

function humanStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

export default function GlobalSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [data, setData] = useState<SearchResults>(EMPTY_RESULTS)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const runSearch = async (term: string) => {
    const normalized = term.trim()
    if (normalized.length < 2) {
      setMessage('Enter at least two characters.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/recruitment/search?q=${encodeURIComponent(normalized)}`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Search is unavailable.')
      setData({ applications: body.applications || [], vacancies: body.vacancies || [] })
      setHasSearched(true)
      window.history.replaceState(null, '', `/recruitment/search?q=${encodeURIComponent(normalized)}`)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Search is unavailable.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (initialQuery.length >= 2) void runSearch(initialQuery)
    // The route supplies the initial query once; subsequent searches stay in this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    await runSearch(query)
  }

  const total = data.applications.length + data.vacancies.length

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="section-panel p-4 sm:p-5">
        <label htmlFor="global-search" className="field-label">
          Search recruitment records
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
            <input
              id="global-search"
              minLength={2}
              maxLength={100}
              required
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, phone, vacancy or reference"
              className="field-control pl-10"
            />
          </div>
          <button disabled={busy} className="btn-primary sm:min-w-28">
            {busy ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p className="field-help">
          You will only see records assigned to you or included in your role’s access.
        </p>
      </form>

      {message && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {message}
        </p>
      )}

      {hasSearched && (
        <>
          <div className="flex items-end justify-between border-b border-stone-300 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Results for “{query.trim()}”</h2>
              <p className="mt-1 text-sm text-stone-600">
                {total} accessible {total === 1 ? 'record' : 'records'}
              </p>
            </div>
          </div>

          {total === 0 ? (
            <div className="empty-state">
              <Search className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-3 text-sm font-semibold text-navy-950">No matching records</p>
              <p className="mt-1 text-sm text-stone-500">Check the spelling or try a reference number.</p>
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <ResultSection
                icon={<UserRound className="h-4 w-4" />}
                title="Candidates and applications"
                count={data.applications.length}
                empty="No applications match."
              >
                {data.applications.map((record) => (
                  <Link
                    key={record.id}
                    href={`/recruitment/applications/${record.id}`}
                    className="group block px-5 py-4 hover:bg-stone-50 sm:px-6"
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span>
                        <strong className="text-sm font-semibold text-navy-950">{record.name}</strong>
                        <span className="mt-1 block text-sm text-stone-700">
                          {record.reference} · {record.vacancy}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400 group-hover:text-brand-700" />
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-stone-500">
                      {[record.department, record.dutyStation, humanStatus(record.status), record.erpPersonnelNumber ? `ERP ${record.erpPersonnelNumber}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {(record.email || record.phone) && (
                      <span className="mt-1 block text-xs text-stone-500">
                        {[record.email, record.phone].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </Link>
                ))}
              </ResultSection>

              <ResultSection
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                title="Vacancies"
                count={data.vacancies.length}
                empty="No vacancies match."
              >
                {data.vacancies.map((record) => (
                  <Link
                    key={record.id}
                    href={`/recruitment/vacancies/${record.id}`}
                    className="group block px-5 py-4 hover:bg-stone-50 sm:px-6"
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span>
                        <strong className="text-sm font-semibold text-navy-950">
                          {record.reference} · {record.title}
                        </strong>
                        <span className="mt-1 block text-xs leading-5 text-stone-500">
                          {[record.project, record.department, record.dutyStation, humanStatus(record.status)]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400 group-hover:text-brand-700" />
                    </span>
                  </Link>
                ))}
              </ResultSection>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResultSection({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section className="section-panel">
      <div className="section-heading">
        <div className="flex items-center gap-2">
          <span className="text-brand-700">{icon}</span>
          <h3 className="text-base font-semibold text-navy-950">{title}</h3>
        </div>
        <span className="text-sm font-medium text-stone-500">{count}</span>
      </div>
      <div className="divide-y divide-stone-200">
        {count ? children : <p className="px-5 py-8 text-center text-sm text-stone-500 sm:px-6">{empty}</p>}
      </div>
    </section>
  )
}
