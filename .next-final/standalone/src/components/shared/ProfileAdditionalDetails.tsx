'use client'

import { useCallback, useEffect, useState } from 'react'

type Skill = { id: string; name: string; proficiency?: string | null }
type Language = { id: string; language: string; speakingLevel: string; readingLevel: string; writingLevel: string }
type Certification = { id: string; name: string; issuingBody?: string | null; credentialNumber?: string | null }
type ProfileDetails = {
  skills: Skill[]
  languages: Language[]
  certifications: Certification[]
}

const emptyDetails: ProfileDetails = { skills: [], languages: [], certifications: [] }

export default function ProfileAdditionalDetails() {
  const [data, setData] = useState<ProfileDetails>(emptyDetails)
  const [kind, setKind] = useState('SKILL')
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [readingLevel, setReadingLevel] = useState('INTERMEDIATE')
  const [writingLevel, setWritingLevel] = useState('INTERMEDIATE')
  const [category, setCategory] = useState('')
  const [credentialNumber, setCredentialNumber] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/candidate/profile')
    const body = await response.json()
    if (response.ok) setData(body.profile ?? emptyDetails)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = kind === 'SKILL'
      ? { kind, name, category: category || undefined, proficiency: level }
      : kind === 'LANGUAGE'
        ? { kind, language: name, speakingLevel: level, readingLevel, writingLevel }
        : { kind, name, issuingBody: detail, credentialNumber: credentialNumber || undefined }
    const response = await fetch('/api/candidate/profile-items', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    })
    const body = await response.json()
    setMessage(response.ok ? editingId ? 'Profile item updated.' : 'Profile item added.' : body.error || 'Failed to save profile item.')
    if (response.ok) {
      setName('')
      setDetail('')
      setCategory('')
      setCredentialNumber('')
      setEditingId(null)
      await load()
    }
  }

  const edit = (itemKind: string, id: string, label: string, secondary = '') => {
    setKind(itemKind)
    setEditingId(id)
    setName(label)
    setDetail(secondary)
    setMessage('')
  }

  const remove = async (itemKind: string, id: string) => {
    const response = await fetch('/api/candidate/profile-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: itemKind, id }),
    })
    const body = await response.json()
    setMessage(response.ok ? 'Profile item removed.' : body.error || 'Failed to remove profile item.')
    if (response.ok) await load()
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-slate-900">Skills, languages and certifications</h2>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded border p-2 text-xs">
          <option value="SKILL">Skill</option>
          <option value="LANGUAGE">Language</option>
          <option value="CERTIFICATION">Certification</option>
        </select>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === 'LANGUAGE' ? 'Language' : kind === 'CERTIFICATION' ? 'Certification' : 'Skill'}
          className="rounded border p-2 text-xs"
        />
        {kind === 'SKILL' && <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category (optional)" className="rounded border p-2 text-xs" />}
        {(kind === 'SKILL' || kind === 'LANGUAGE') && <select aria-label={kind === 'SKILL' ? 'Proficiency' : 'Speaking level'} value={level} onChange={(event) => setLevel(event.target.value)} className="rounded border p-2 text-xs">
          {(kind === 'SKILL' ? ['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'] : ['BASIC','INTERMEDIATE','FLUENT','NATIVE']).map((value) => <option key={value}>{value}</option>)}
        </select>}
        {kind === 'LANGUAGE' && <>
          <select aria-label="Reading level" value={readingLevel} onChange={(event) => setReadingLevel(event.target.value)} className="rounded border p-2 text-xs">{['BASIC','INTERMEDIATE','FLUENT','NATIVE'].map((value) => <option key={value} value={value}>{value} reading</option>)}</select>
          <select aria-label="Writing level" value={writingLevel} onChange={(event) => setWritingLevel(event.target.value)} className="rounded border p-2 text-xs">{['BASIC','INTERMEDIATE','FLUENT','NATIVE'].map((value) => <option key={value} value={value}>{value} writing</option>)}</select>
        </>}
        {kind === 'CERTIFICATION' && (
          <><input required value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Issuing body" className="rounded border p-2 text-xs" /><input value={credentialNumber} onChange={(event) => setCredentialNumber(event.target.value)} placeholder="Credential number (optional)" className="rounded border p-2 text-xs" /></>
        )}
        <div className="flex gap-2">
          <button className="w-fit rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">{editingId ? 'Save' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setName(''); setDetail('') }} className="rounded border px-3 py-2 text-xs font-bold">Cancel</button>}
        </div>
      </form>
      {message && <p role="status" className="text-xs text-slate-600">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <ProfileItems title="Skills" color="blue" items={data.skills.map((item) => ({ id: item.id, label: item.name, secondary: item.proficiency || '' }))} onEdit={(id, label) => edit('SKILL', id, label)} onRemove={(id) => remove('SKILL', id)} />
        <ProfileItems title="Languages" color="emerald" items={data.languages.map((item) => ({ id: item.id, label: item.language, secondary: `Speak ${item.speakingLevel} · Read ${item.readingLevel} · Write ${item.writingLevel}` }))} onEdit={(id, label) => edit('LANGUAGE', id, label)} onRemove={(id) => remove('LANGUAGE', id)} />
        <ProfileItems title="Certifications" color="amber" items={data.certifications.map((item) => ({ id: item.id, label: item.name, secondary: [item.issuingBody, item.credentialNumber].filter(Boolean).join(' · ') }))} onEdit={(id, label, secondary) => edit('CERTIFICATION', id, label, secondary)} onRemove={(id) => remove('CERTIFICATION', id)} />
      </div>
    </section>
  )
}

function ProfileItems({ title, color, items, onEdit, onRemove }: { title: string; color: 'blue' | 'emerald' | 'amber'; items: { id: string; label: string; secondary?: string }[]; onEdit: (id: string, label: string, secondary?: string) => void; onRemove: (id: string) => void }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
  }
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-slate-500">{title}</h3>
      {items.length === 0 && <p className="mt-1 text-xs text-slate-400">None added.</p>}
      {items.map((item) => <div key={item.id} className={`my-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${colors[color]}`}>
        <span>{item.label}{item.secondary && <small className="block opacity-75">{item.secondary}</small>}</span>
        <span className="flex gap-2">
          <button type="button" onClick={() => onEdit(item.id, item.label, item.secondary)} className="font-bold underline">Edit</button>
          <button type="button" onClick={() => onRemove(item.id)} className="font-bold underline">Delete</button>
        </span>
      </div>)}
    </div>
  )
}
