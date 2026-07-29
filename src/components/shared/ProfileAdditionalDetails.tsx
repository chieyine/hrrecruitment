'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/Dialog'

type Skill = {
  id: string
  name: string
  category?: string | null
  proficiency?: string | null
}
type Language = {
  id: string
  language: string
  speakingLevel: string
  readingLevel: string
  writingLevel: string
}
type Certification = {
  id: string
  name: string
  issuingBody?: string | null
  credentialNumber?: string | null
}
type ProfileDetails = {
  skills: Skill[]
  languages: Language[]
  certifications: Certification[]
}
type ItemKind = 'SKILL' | 'LANGUAGE' | 'CERTIFICATION'

export default function ProfileAdditionalDetails({ initialData }: { initialData: ProfileDetails }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [kind, setKind] = useState<ItemKind>('SKILL')
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [readingLevel, setReadingLevel] = useState('INTERMEDIATE')
  const [writingLevel, setWritingLevel] = useState('INTERMEDIATE')
  const [category, setCategory] = useState('')
  const [credentialNumber, setCredentialNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ kind: ItemKind; id: string; label: string } | null>(null)

  useEffect(() => setData(initialData), [initialData])

  function resetForm(nextKind: ItemKind = kind) {
    setKind(nextKind)
    setEditingId(null)
    setName('')
    setDetail('')
    setCategory('')
    setCredentialNumber('')
    setLevel(nextKind === 'SKILL' ? 'INTERMEDIATE' : 'INTERMEDIATE')
    setReadingLevel('INTERMEDIATE')
    setWritingLevel('INTERMEDIATE')
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    const payload =
      kind === 'SKILL'
        ? { kind, name, category: category || undefined, proficiency: level }
        : kind === 'LANGUAGE'
          ? { kind, language: name, speakingLevel: level, readingLevel, writingLevel }
          : { kind, name, issuingBody: detail, credentialNumber: credentialNumber || undefined }
    try {
      const response = await fetch('/api/candidate/profile-items', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The profile item could not be saved.')
      setMessage(editingId ? 'Item updated.' : 'Item added.')
      resetForm(kind)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The profile item could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  function editSkill(item: Skill) {
    resetForm('SKILL')
    setEditingId(item.id)
    setName(item.name)
    setCategory(item.category || '')
    setLevel(item.proficiency || 'INTERMEDIATE')
  }

  function editLanguage(item: Language) {
    resetForm('LANGUAGE')
    setEditingId(item.id)
    setName(item.language)
    setLevel(item.speakingLevel)
    setReadingLevel(item.readingLevel)
    setWritingLevel(item.writingLevel)
  }

  function editCertification(item: Certification) {
    resetForm('CERTIFICATION')
    setEditingId(item.id)
    setName(item.name)
    setDetail(item.issuingBody || '')
    setCredentialNumber(item.credentialNumber || '')
  }

  async function remove() {
    if (!pendingDelete) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/candidate/profile-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: pendingDelete.kind, id: pendingDelete.id }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The profile item could not be removed.')
      setMessage('Item removed.')
      setPendingDelete(null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The profile item could not be removed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Skills, languages and certifications</h2>
          <p className="mt-1 text-sm text-stone-600">Add only details that are relevant to roles you may apply for.</p>
        </div>
      </div>

      <form
        onSubmit={save}
        className="grid gap-4 border-b border-stone-200 bg-stone-50 px-5 py-5 sm:px-6 lg:grid-cols-2"
      >
        <label>
          <span className="field-label">Detail type</span>
          <select
            value={kind}
            onChange={(event) => resetForm(event.target.value as ItemKind)}
            disabled={Boolean(editingId)}
            className="field-control mt-1.5"
          >
            <option value="SKILL">Skill</option>
            <option value="LANGUAGE">Language</option>
            <option value="CERTIFICATION">Certification</option>
          </select>
        </label>
        <label>
          <span className="field-label">
            {kind === 'LANGUAGE' ? 'Language' : kind === 'CERTIFICATION' ? 'Certification' : 'Skill'}
          </span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field-control mt-1.5"
          />
        </label>

        {kind === 'SKILL' && (
          <>
            <label>
              <span className="field-label">Category (optional)</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field-control mt-1.5"
              />
            </label>
            <LevelField
              label="Proficiency"
              value={level}
              onChange={setLevel}
              values={['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']}
            />
          </>
        )}

        {kind === 'LANGUAGE' && (
          <>
            <LevelField
              label="Speaking"
              value={level}
              onChange={setLevel}
              values={['BASIC', 'INTERMEDIATE', 'FLUENT', 'NATIVE']}
            />
            <LevelField
              label="Reading"
              value={readingLevel}
              onChange={setReadingLevel}
              values={['BASIC', 'INTERMEDIATE', 'FLUENT', 'NATIVE']}
            />
            <LevelField
              label="Writing"
              value={writingLevel}
              onChange={setWritingLevel}
              values={['BASIC', 'INTERMEDIATE', 'FLUENT', 'NATIVE']}
            />
          </>
        )}

        {kind === 'CERTIFICATION' && (
          <>
            <label>
              <span className="field-label">Issuing body</span>
              <input
                required
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                className="field-control mt-1.5"
              />
            </label>
            <label>
              <span className="field-label">Credential number (optional)</span>
              <input
                value={credentialNumber}
                onChange={(event) => setCredentialNumber(event.target.value)}
                className="field-control mt-1.5"
              />
            </label>
          </>
        )}

        <div className="flex items-end gap-2 lg:col-span-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
          </button>
          {editingId && (
            <button type="button" onClick={() => resetForm(kind)} disabled={busy} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="text-xs font-semibold text-emerald-700 lg:col-span-2">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-700 lg:col-span-2">
            {error}
          </p>
        )}
      </form>

      <div className="grid divide-y divide-stone-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <ItemList
          title="Skills"
          items={data.skills.map((item) => ({
            id: item.id,
            label: item.name,
            secondary: [item.category, humanLabel(item.proficiency)].filter(Boolean).join(' · '),
            edit: () => editSkill(item),
            remove: () => setPendingDelete({ kind: 'SKILL', id: item.id, label: item.name }),
          }))}
        />
        <ItemList
          title="Languages"
          items={data.languages.map((item) => ({
            id: item.id,
            label: item.language,
            secondary: `Speaking ${humanLabel(item.speakingLevel)} · Reading ${humanLabel(item.readingLevel)} · Writing ${humanLabel(item.writingLevel)}`,
            edit: () => editLanguage(item),
            remove: () => setPendingDelete({ kind: 'LANGUAGE', id: item.id, label: item.language }),
          }))}
        />
        <ItemList
          title="Certifications"
          items={data.certifications.map((item) => ({
            id: item.id,
            label: item.name,
            secondary: [item.issuingBody, item.credentialNumber].filter(Boolean).join(' · '),
            edit: () => editCertification(item),
            remove: () => setPendingDelete({ kind: 'CERTIFICATION', id: item.id, label: item.name }),
          }))}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!busy) setPendingDelete(null)
        }}
        onConfirm={remove}
        title="Remove this item?"
        description={`${pendingDelete?.label || 'This item'} will be removed from your reusable profile. Submitted applications will not change.`}
        confirmLabel="Remove item"
        tone="danger"
        busy={busy}
      />
    </section>
  )
}

function LevelField({
  label,
  value,
  onChange,
  values,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  values: string[]
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field-control mt-1.5">
        {values.map((option) => (
          <option key={option} value={option}>
            {humanLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function ItemList({
  title,
  items,
}: {
  title: string
  items: Array<{ id: string; label: string; secondary: string; edit: () => void; remove: () => void }>
}) {
  return (
    <div className="p-5 sm:p-6">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">None added.</p>
      ) : (
        <div className="mt-3 divide-y divide-stone-100">
          {items.map((item) => (
            <div key={item.id} className="py-3">
              <p className="text-sm font-semibold text-navy-900">{item.label}</p>
              {item.secondary && <p className="mt-0.5 text-xs leading-5 text-stone-500">{item.secondary}</p>}
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={item.edit}
                  className="text-xs font-semibold text-brand-800 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={item.remove}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function humanLabel(value?: string | null) {
  if (!value) return ''
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}
