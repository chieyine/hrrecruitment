'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, Search, UserMinus, UsersRound } from 'lucide-react'
import { ReasonDialog } from '@/components/ui/Dialog'

type Member = {
  id: string
  status: string
  tagsJson: string
  notes: string | null
  sourceApplicationId: string | null
  addedAt: Date | string
  candidate: {
    id: string
    legalFirstName: string
    lastName: string
    user: { email: string }
    skills: Array<{ name: string }>
  }
}

type Pool = {
  id: string
  name: string
  description: string | null
  poolType: string
  members: Member[]
}

type Candidate = {
  id: string
  legalFirstName: string
  lastName: string
  possibleDuplicate: boolean
  user: { email: string }
  skills: Array<{ name: string }>
  applications: Array<{ id: string; vacancy: { title: string; referenceNumber: string } }>
}

function poolTypeLabel(value: string) {
  const labels: Record<string, string> = {
    GENERAL: 'General',
    ROLE: 'Role family',
    SKILL: 'Skills',
    RESERVE: 'Reserve candidates',
    ALUMNI: 'Former staff',
  }
  return labels[value] || value
}

function readTags(value: string) {
  try {
    const tags = JSON.parse(value)
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}

export default function TalentPoolManager({
  pools,
  candidates,
  initialPoolId = '',
}: {
  pools: Pool[]
  candidates: Candidate[]
  initialPoolId?: string
}) {
  const router = useRouter()
  const [poolId, setPoolId] = useState(
    initialPoolId && pools.some((pool) => pool.id === initialPoolId) ? initialPoolId : pools[0]?.id || ''
  )
  const [view, setView] = useState<'members' | 'add'>(pools.length ? 'members' : 'add')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [poolType, setPoolType] = useState('GENERAL')
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<Member | null>(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const selectedPool = pools.find((pool) => pool.id === poolId)
  const selectedMemberIds = new Set(selectedPool?.members.map((member) => member.candidate.id) || [])
  const needle = search.trim().toLowerCase()

  const visibleMembers = useMemo(
    () =>
      (selectedPool?.members || []).filter((member) => {
        if (!needle) return true
        return [
          member.candidate.legalFirstName,
          member.candidate.lastName,
          member.candidate.user.email,
          ...member.candidate.skills.map((skill) => skill.name),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      }),
    [selectedPool, needle]
  )

  const availableCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        if (selectedMemberIds.has(candidate.id)) return false
        if (!needle) return true
        return [
          candidate.legalFirstName,
          candidate.lastName,
          candidate.user.email,
          ...candidate.skills.map((skill) => skill.name),
          ...candidate.applications.flatMap((application) => [
            application.vacancy.referenceNumber,
            application.vacancy.title,
          ]),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      }),
    [candidates, selectedMemberIds, needle]
  )

  async function send(payload: object, successMessage: string) {
    setMessage('')
    setIsError(false)
    setBusy(JSON.stringify(payload))
    try {
      const response = await fetch('/api/recruitment/talent-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The change could not be saved.')
      setMessage(successMessage)
      if ('pool' in data && data.pool?.id) {
        setPoolId(data.pool.id)
        setName('')
        setDescription('')
        setView('members')
      }
      router.refresh()
      return true
    } catch (cause) {
      setIsError(true)
      setMessage(cause instanceof Error ? cause.message : 'The change could not be saved.')
      return false
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="section-panel">
        <div className="section-heading">
          <div>
            <h2 className="text-lg font-semibold text-navy-950">Pools</h2>
            <p className="mt-1 text-sm text-stone-600">{pools.length} active</p>
          </div>
        </div>
        <div className="divide-y divide-stone-200">
          {pools.map((pool) => (
            <button
              key={pool.id}
              type="button"
              onClick={() => {
                setPoolId(pool.id)
                setView('members')
                setSearch('')
                window.history.replaceState(null, '', `/recruitment/talent-pools?pool=${encodeURIComponent(pool.id)}`)
              }}
              className={`w-full px-5 py-4 text-left transition sm:px-6 ${
                poolId === pool.id ? 'bg-brand-50' : 'hover:bg-stone-50'
              }`}
            >
              <span className={`block text-sm font-semibold ${poolId === pool.id ? 'text-brand-900' : 'text-navy-950'}`}>
                {pool.name}
              </span>
              <span className="mt-1 block text-xs text-stone-500">
                {pool.members.length} {pool.members.length === 1 ? 'candidate' : 'candidates'} · {poolTypeLabel(pool.poolType)}
              </span>
            </button>
          ))}
          {!pools.length && <p className="px-5 py-6 text-sm text-stone-500 sm:px-6">No pools have been created.</p>}
        </div>
        <details className="border-t border-stone-200">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-brand-800 sm:px-6">
            <Plus className="h-4 w-4" /> Create a pool
          </summary>
          <div className="space-y-4 border-t border-stone-200 bg-stone-50 px-5 py-5 sm:px-6">
            <label>
              <span className="field-label">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="field-control" />
            </label>
            <label>
              <span className="field-label">Purpose</span>
              <select value={poolType} onChange={(event) => setPoolType(event.target.value)} className="field-control">
                <option value="GENERAL">General</option>
                <option value="ROLE">Role family</option>
                <option value="SKILL">Skills</option>
                <option value="RESERVE">Reserve candidates</option>
                <option value="ALUMNI">Former staff</option>
              </select>
            </label>
            <label>
              <span className="field-label">Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="field-control" />
            </label>
            <button
              type="button"
              disabled={name.trim().length < 3 || Boolean(busy)}
              onClick={() => void send({ action: 'CREATE_POOL', name, description: description || undefined, poolType }, 'Pool created.')}
              className="btn-primary w-full"
            >
              Create pool
            </button>
          </div>
        </details>
      </aside>

      <section className="section-panel">
        {selectedPool ? (
          <>
            <div className="section-heading">
              <div>
                <h2 className="text-lg font-semibold text-navy-950">{selectedPool.name}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {selectedPool.description || poolTypeLabel(selectedPool.poolType)}
                </p>
              </div>
              <span className="text-sm font-medium text-stone-500">{selectedPool.members.length} members</span>
            </div>

            <div className="flex flex-col gap-3 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <nav aria-label="Talent pool sections" className="flex gap-6">
                <button type="button" onClick={() => setView('members')} className={`border-b-2 pb-2 text-sm font-semibold ${view === 'members' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
                  Members
                </button>
                <button type="button" onClick={() => setView('add')} className={`border-b-2 pb-2 text-sm font-semibold ${view === 'add' ? 'border-brand-700 text-navy-950' : 'border-transparent text-stone-500'}`}>
                  Add candidates
                </button>
              </nav>
              <label className="relative w-full sm:max-w-xs">
                <span className="sr-only">Search {view === 'members' ? 'members' : 'candidates'}</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === 'members' ? 'Search members' : 'Search eligible candidates'} className="field-control pl-9" />
              </label>
            </div>

            {message && (
              <p role={isError ? 'alert' : 'status'} className={`border-b px-5 py-3 text-sm sm:px-6 ${isError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                {message}
              </p>
            )}

            {view === 'members' ? (
              <div className="divide-y divide-stone-200">
                {!visibleMembers.length ? (
                  <Empty
                    title={search ? 'No members match this search.' : 'This pool has no members.'}
                    action={!search ? <button type="button" onClick={() => setView('add')} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">Add candidates</button> : null}
                  />
                ) : (
                  visibleMembers.map((member) => {
                    const tags = readTags(member.tagsJson)
                    return (
                      <div key={member.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">
                            {member.candidate.legalFirstName} {member.candidate.lastName}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">{member.candidate.user.email}</p>
                          <p className="mt-2 text-xs text-stone-600">
                            {(tags.length ? tags : member.candidate.skills.map((skill) => skill.name)).slice(0, 5).join(' · ') || 'No skills recorded'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {member.sourceApplicationId && (
                            <Link href={`/recruitment/applications/${member.sourceApplicationId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                              Source application <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <button type="button" onClick={() => setRemoving(member)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                            <UserMinus className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {!availableCandidates.length ? (
                  <Empty title={search ? 'No eligible candidates match this search.' : 'No more candidates are available for this pool.'} />
                ) : (
                  availableCandidates.map((candidate) => {
                    const source = candidate.applications[0]
                    return (
                      <div key={candidate.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-navy-950">{candidate.legalFirstName} {candidate.lastName}</p>
                            {candidate.possibleDuplicate && (
                              <Link href="/recruitment/quality?view=duplicates" className="status-chip bg-amber-50 text-amber-900">Check possible duplicate</Link>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-stone-500">
                            {source ? `${source.vacancy.referenceNumber} · ${source.vacancy.title}` : candidate.user.email}
                          </p>
                          <p className="mt-2 text-xs text-stone-600">{candidate.skills.slice(0, 5).map((skill) => skill.name).join(' · ') || 'No skills recorded'}</p>
                        </div>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void send(
                              {
                                action: 'ADD_MEMBER',
                                talentPoolId: poolId,
                                candidateId: candidate.id,
                                sourceApplicationId: source?.id,
                                tags: candidate.skills.slice(0, 5).map((skill) => skill.name),
                              },
                              `${candidate.legalFirstName} ${candidate.lastName} added.`
                            )
                          }
                          className="btn-secondary min-h-10 px-4 py-2 text-xs"
                        >
                          Add to pool
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <Empty
            title="Create the first talent pool."
            action={<p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">Use a clear role, skill or reserve-group name so colleagues know who belongs in it.</p>}
          />
        )}
      </section>

      <ReasonDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={async (reason: string) => {
          if (!removing) return
          const removed = await send({ action: 'REMOVE_MEMBER', memberId: removing.id, reason }, 'Candidate removed from this pool.')
          if (removed) setRemoving(null)
        }}
        title="Remove candidate from pool"
        description={removing ? `Remove ${removing.candidate.legalFirstName} ${removing.candidate.lastName} from ${selectedPool?.name}?` : ''}
        confirmLabel="Remove candidate"
        reasonLabel="Reason"
        reasonRequired
        tone="danger"
      />
    </div>
  )
}

function Empty({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <UsersRound className="mx-auto h-6 w-6 text-stone-400" />
      <p className="mt-3 text-sm font-semibold text-navy-950">{title}</p>
      {action}
    </div>
  )
}
