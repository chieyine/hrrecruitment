'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Search, Copy, History } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'


export interface CrudField {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'date' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
}

interface AdminCrudProps {
  entity: string
  title: string
  subtitle?: string
  fields: CrudField[]
  columns: { name: string; label: string }[]
  readOnly?: boolean
}

export default function AdminCrud({
  entity,
  title,
  subtitle,
  fields,
  columns,
  readOnly = false,
}: AdminCrudProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)
  const [deletingImpact, setDeletingImpact] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<{ item: any; versions: any[] } | null>(null)
  const [draftReason, setDraftReason] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [query, setQuery] = useState('')
  const { toast } = useToast()
  const visibleItems = query.trim()
    ? items.filter((item) => columns.some((column) => String(item[column.name] ?? '').toLowerCase().includes(query.trim().toLowerCase())))
    : items

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/generic?entity=${encodeURIComponent(entity)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setItems(json.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [entity])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    const blank: Record<string, any> = {}
    for (const f of fields) blank[f.name] = f.type === 'checkbox' ? true : ''
    try {
      const saved = JSON.parse(localStorage.getItem(`frad-admin-draft:${entity}:new`) || '{}')
      setForm(saved.form || blank)
      if (saved.form) toast('info', 'Restored your unfinished draft.')
    } catch { setForm(blank) }
    setShowForm(true)
  }

  function openEdit(item: any) {
    setEditing(item)
    const populated: Record<string, any> = {}
    for (const f of fields) {
      let v = item[f.name]
      if (f.type === 'date' && v) v = new Date(v).toISOString().slice(0, 10)
      populated[f.name] = v ?? (f.type === 'checkbox' ? false : '')
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`frad-admin-draft:${entity}:${item.id}`) || '{}')
      setForm(saved.form || populated)
      if (saved.form) toast('info', 'Restored your unfinished changes.')
    } catch { setForm(populated) }
    setDraftReason('')
    setScheduledFor('')
    setEffectiveFrom('')
    setEffectiveTo('')
    setShowForm(true)
  }

  function openClone(item: any) {
    const populated: Record<string, any> = {}
    for (const field of fields) {
      let value = item[field.name]
      if (field.type === 'date' && value) value = new Date(value).toISOString().slice(0, 10)
      if (['name', 'title'].includes(field.name) && value) value = `${value} — copy`
      if (field.name === 'code' && value) value = `${value}_COPY_${String(Date.now()).slice(-6)}`
      populated[field.name] = value ?? (field.type === 'checkbox' ? false : '')
    }
    setEditing(null)
    setForm(populated)
    setShowForm(true)
  }

  useEffect(() => {
    if (!showForm) return
    const key = `frad-admin-draft:${entity}:${editing?.id || 'new'}`
    const timer = window.setTimeout(() => localStorage.setItem(key, JSON.stringify({ form, draftReason, scheduledFor, effectiveFrom, effectiveTo, savedAt: new Date().toISOString() })), 400)
    return () => window.clearTimeout(timer)
  }, [showForm, entity, editing?.id, form, draftReason, scheduledFor, effectiveFrom, effectiveTo])

  async function openHistory(item: any) {
    const response = await fetch(`/api/admin/generic?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(item.id)}&history=1`)
    const body = await response.json()
    if (!response.ok) return toast('error', body.error || 'Could not load version history.')
    setHistory({ item: body.current, versions: body.versions || [] })
  }

  async function prepareRemove(item: any) {
    setDeletingImpact({})
    const response = await fetch(`/api/admin/generic?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(item.id)}&impact=1`)
    if (response.ok) {
      const body = await response.json()
      setDeletingImpact(body.counts || {})
    }
    setDeleting(item)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const controlledDraft = Boolean(editing?.version !== undefined)
      if (controlledDraft && draftReason.trim().length < 10) throw new Error('Explain the reason for this configuration change (at least 10 characters).')
      const method = controlledDraft ? 'POST' : editing ? 'PUT' : 'POST'
      const body: any = { entity, data: form }
      if (editing) body.id = editing.id
      if (controlledDraft) Object.assign(body, { reason: draftReason, ...(scheduledFor ? { scheduledFor } : {}), ...(effectiveFrom ? { effectiveFrom } : {}), ...(effectiveTo ? { effectiveTo } : {}) })
      const res = await fetch(controlledDraft ? '/api/admin/configuration-releases' : '/api/admin/generic', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      localStorage.removeItem(`frad-admin-draft:${entity}:${editing?.id || 'new'}`)
      setShowForm(false)
      toast('success', controlledDraft ? 'Configuration draft created for review.' : editing ? 'Record updated.' : 'Record created.')
      await load()
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: any) {
    try {
      const res = await fetch('/api/admin/generic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, id: item.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      toast('success', 'Record removed.')
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast('error', e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-intro flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-slate-600 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/configuration-releases" className="btn-secondary min-h-0 px-3 py-2">Review drafts</a>
          <button
            onClick={load}
            className="btn-secondary min-h-0 px-3 py-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {!readOnly && (
            <button
              onClick={openCreate}
              className="btn-primary min-h-0 px-4 py-2"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label className="relative block max-w-sm flex-1">
          <span className="sr-only">Search {title.toLowerCase()}</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="field-control pl-9" />
        </label>
        <p className="text-xs font-medium text-stone-500">{visibleItems.length} of {items.length} records</p>
      </div>

      <div className="overflow-x-auto section-panel">
        <table className="data-table min-w-[680px]">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th key={c.name} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {c.label}
                </th>
              ))}
              {!readOnly && <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                  {query ? 'No records match your search.' : 'No records have been added.'}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  {columns.map((c) => (
                    <td key={c.name} className="px-4 py-3 text-slate-700">
                      {renderCell(item[c.name])}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button aria-label="Edit" title="Edit" onClick={() => openEdit(item)} className="mr-2 text-slate-500 hover:text-blue-600">
                        <Pencil className="inline h-4 w-4" />
                      </button>
                      {item.version !== undefined && <button aria-label="Copy" title="Create a copy" onClick={() => openClone(item)} className="mr-2 text-slate-500 hover:text-blue-600"><Copy className="inline h-4 w-4" /></button>}
                      {item.version !== undefined && <button aria-label="Version history" title="Version history" onClick={() => void openHistory(item)} className="mr-2 text-slate-500 hover:text-blue-600"><History className="inline h-4 w-4" /></button>}
                      <button aria-label="Delete" title="Delete" onClick={() => void prepareRemove(item)} className="text-slate-500 hover:text-rose-600">
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={`${editing ? 'Edit' : 'Create'} ${title.replace(/s$/, '')}`}
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <label htmlFor={`${entity}-${f.name}`} className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      id={`${entity}-${f.name}`}
                      name={f.name}
                      required={f.required}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      rows={3}
                      className="field-control"
                    />
                  ) : f.type === 'checkbox' ? (
                    <input
                      id={`${entity}-${f.name}`}
                      name={f.name}
                      type="checkbox"
                      checked={!!form[f.name]}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      id={`${entity}-${f.name}`}
                      name={f.name}
                      required={f.required}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="field-control"
                    >
                      <option value="">Select…</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`${entity}-${f.name}`}
                      name={f.name}
                      required={f.required}
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="field-control"
                    />
                  )}
                </div>
              ))}
              {editing?.version !== undefined && <div className="space-y-4 border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-900">Release controls</p>
                <label className="block"><span className="field-label">Reason for change</span><textarea required minLength={10} value={draftReason} onChange={(event) => setDraftReason(event.target.value)} rows={3} className="field-control" placeholder="Explain why this change is needed and what users it affects."/></label>
                <div className="grid gap-3 sm:grid-cols-3"><label><span className="field-label">Scheduled publication</span><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="field-control"/></label><label><span className="field-label">Effective from</span><input type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="field-control"/></label><label><span className="field-label">Effective until</span><input type="datetime-local" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} className="field-control"/></label></div>
                <p className="text-xs leading-5 text-slate-500">Saving creates a draft. A different system administrator must approve it before publication.</p>
              </div>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing?.version !== undefined ? 'Create draft' : 'Save'}
              </button>
            </div>
        </div>
      </Dialog>

      <ReasonDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) return remove(deleting) }}
        title={`Remove "${deleting?.name || deleting?.title || deleting?.code || 'record'}"?`}
        description={`Records with an active flag are deactivated rather than permanently deleted.${Object.keys(deletingImpact).length ? ` Current dependencies: ${Object.entries(deletingImpact).map(([label, count]) => `${label}: ${count}`).join('; ')}.` : ' No linked operational records were found by the impact check.'}`}
        confirmLabel="Remove"
        reasonLabel="Note"
        tone="danger"
      />
      <Dialog open={history !== null} onClose={() => setHistory(null)} title="Version history">
        {history && <div className="space-y-4">
          <div className="border border-blue-200 bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-950">Current version {history.item.version}</p><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-blue-900">{JSON.stringify(history.item, null, 2)}</pre></div>
          {history.versions.length === 0 ? <p className="text-sm text-slate-600">No earlier versions have been recorded yet.</p> : <ol className="max-h-72 space-y-3 overflow-y-auto">{history.versions.map((version) => <li key={version.id} className="border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-900">Version {version.version}</p><p className="mt-1 text-xs text-slate-500">{new Date(version.createdAt).toLocaleString()} · {version.changeReason || 'Administrative update'}</p><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-blue-700">Compare stored values</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap bg-slate-50 p-2 text-xs">{JSON.stringify(JSON.parse(version.snapshotJson), null, 2)}</pre></details></li>)}</ol>}
        </div>}
      </Dialog>
    </div>
  )
}

function renderCell(v: any) {
  if (v === true) return <span className="text-emerald-600 font-semibold">Yes</span>
  if (v === false) return <span className="text-slate-400">No</span>
  if (v === null || v === undefined || v === '') return <span className="text-slate-300">—</span>
  if (typeof v === 'object') return <span className="text-slate-400">…</span>
  const s = String(v)
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}
