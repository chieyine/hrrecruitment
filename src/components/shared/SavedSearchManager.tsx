'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, BellOff, Trash2, Loader2, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

/**
 * Candidate-facing saved searches and job alerts.
 *
 * Candidates previously had no way to be told about a matching vacancy; talent
 * pools are a recruiter-side pull, not a subscription.
 */

interface SavedSearch {
  id: string
  name: string
  criteria: {
    search?: string
    departmentId?: string
    categoryId?: string
    dutyStationId?: string
    contractType?: string
  }
  alertsEnabled: boolean
  frequency: string
  lastAlertAt: string | null
}

export default function SavedSearchManager() {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [dutyStations, setDutyStations] = useState<Array<{ id: string; name: string }>>([])
  const [maximum, setMaximum] = useState(10)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    search: '',
    departmentId: '',
    categoryId: '',
    dutyStationId: '',
    frequency: 'DAILY',
  })

  const load = useCallback(async () => {
    const [saved, reference] = await Promise.all([
      fetch('/api/candidate/saved-searches'),
      fetch('/api/public/vacancies?pageSize=1'),
    ])
    if (saved.ok) {
      const data = await saved.json()
      setSearches(data.savedSearches ?? [])
      setMaximum(data.maximum ?? 10)
    }
    if (reference.ok) {
      // Derive the filter options from the open vacancies themselves, so a
      // candidate is only ever offered filters that can actually match.
      const all = await fetch('/api/public/vacancies?pageSize=200')
      if (all.ok) {
        const data = await all.json()
        const vacancies = data.vacancies ?? []
        const uniqueBy = (key: 'department' | 'category' | 'dutyStation') => {
          const map = new Map<string, string>()
          for (const vacancy of vacancies) {
            if (vacancy[key]?.id) map.set(vacancy[key].id, vacancy[key].name)
          }
          return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
        }
        setDepartments(uniqueBy('department'))
        setCategories(uniqueBy('category'))
        setDutyStations(uniqueBy('dutyStation'))
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const call = async (method: string, body: unknown, label: string) => {
    setBusy(label)
    setMessage('')
    try {
      const response = await fetch('/api/candidate/saved-searches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || 'That did not work')
        return false
      }
      await load()
      return true
    } finally {
      setBusy(null)
    }
  }

  const create = async () => {
    const criteria = {
      search: draft.search.trim() || undefined,
      departmentId: draft.departmentId || undefined,
      categoryId: draft.categoryId || undefined,
      dutyStationId: draft.dutyStationId || undefined,
    }
    if (await call('POST', { name: draft.name, criteria, frequency: draft.frequency, alertsEnabled: true }, 'create')) {
      setDraft({ name: '', search: '', departmentId: '', categoryId: '', dutyStationId: '', frequency: 'DAILY' })
      setAdding(false)
      setMessage('Saved. We will email you when a matching vacancy opens.')
    }
  }

  const describe = (search: SavedSearch) => {
    const parts: string[] = []
    if (search.criteria.search) parts.push(`"${search.criteria.search}"`)
    if (search.criteria.departmentId) {
      parts.push(departments.find((item) => item.id === search.criteria.departmentId)?.name ?? 'a department')
    }
    if (search.criteria.categoryId) {
      parts.push(categories.find((item) => item.id === search.criteria.categoryId)?.name ?? 'a job family')
    }
    if (search.criteria.dutyStationId) {
      parts.push(dutyStations.find((item) => item.id === search.criteria.dutyStationId)?.name ?? 'a location')
    }
    return parts.length ? parts.join(' · ') : 'All open vacancies'
  }

  return (
    <section className="section-panel" aria-labelledby="alerts-heading">
      <div className="section-heading">
        <div>
          <h2 id="alerts-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <BellRing className="h-5 w-5 text-brand-700" aria-hidden /> Job alerts
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Save a search and we will email you when a new vacancy matches it. You can turn any alert off at any time.
          </p>
        </div>
        {!adding && searches.length < maximum && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-secondary inline-flex items-center gap-2 text-xs"
          >
            <Plus className="h-4 w-4" aria-hidden /> New alert
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Name this alert
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="e.g. Health roles in Abuja"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Keywords
              <input
                value={draft.search}
                onChange={(event) => setDraft({ ...draft, search: event.target.value })}
                placeholder="e.g. nurse, logistics"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Department
              <select
                value={draft.departmentId}
                onChange={(event) => setDraft({ ...draft, departmentId: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">Any department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Job family
              <select
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">Any job family</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Location
              <select
                value={draft.dutyStationId}
                onChange={(event) => setDraft({ ...draft, dutyStationId: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">Any location</option>
                {dutyStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              How often
              <select
                value={draft.frequency}
                onChange={(event) => setDraft({ ...draft, frequency: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={
                !draft.name.trim() ||
                busy !== null ||
                (!draft.search.trim() && !draft.departmentId && !draft.categoryId && !draft.dutyStationId)
              }
              className="btn-primary inline-flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {busy === 'create' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Save alert
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Add at least one keyword, team, job family or location.</p>
        </div>
      )}

      {searches.length === 0 && !adding ? (
        <p className="text-sm text-slate-600">You have no job alerts yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {searches.map((search) => (
            <li key={search.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{search.name}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {describe(search)} · {search.frequency.toLowerCase()}
                  {search.lastAlertAt
                    ? ` · last sent ${formatDate(search.lastAlertAt)}`
                    : ' · not sent yet'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => call('PATCH', { id: search.id, alertsEnabled: !search.alertsEnabled }, search.id)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  {search.alertsEnabled ? (
                    <BellRing className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                  ) : (
                    <BellOff className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  )}
                  {search.alertsEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => call('DELETE', { id: search.id }, search.id)}
                  disabled={busy !== null}
                  aria-label={`Delete alert ${search.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300 text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">
          {message}
        </p>
      )}
    </section>
  )
}
