'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Pool = { id: string; name: string }
type Candidate = {
  id: string
  legalFirstName: string
  lastName: string
  possibleDuplicate: boolean
  user: { email: string }
  skills: Array<{ name: string }>
  applications: Array<{ id: string; vacancy: { title: string; referenceNumber: string } }>
}

export default function TalentPoolManager({ pools, candidates }: { pools: Pool[]; candidates: Candidate[] }) {
  const router = useRouter()
  const [poolId, setPoolId] = useState(pools[0]?.id || '')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  async function send(payload: object) {
    setMessage('')
    const response = await fetch('/api/recruitment/talent-pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Action failed')
    setMessage('Saved.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Create a governed pool</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Finance reserve candidates"
            className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm"
          />
          <button
            onClick={() => send({ action: 'CREATE_POOL', name, poolType: 'GENERAL' })}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-bold text-white"
          >
            Create pool
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Consented candidates</h2>
            <p className="text-xs text-slate-500">
              Only candidates who opted into future-opportunity contact appear here.
            </p>
          </div>
          <select
            value={poolId}
            onChange={(event) => setPoolId(event.target.value)}
            className="rounded-lg border border-slate-300 p-2.5 text-sm"
          >
            <option value="">Select a pool</option>
            {pools.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.name}
              </option>
            ))}
          </select>
        </div>
        {message && (
          <p role="status" className="mt-3 text-xs font-semibold text-brand-700">
            {message}
          </p>
        )}
        <div className="mt-4 divide-y divide-slate-100">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No candidates have opted into the talent pool yet.
            </p>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {candidate.legalFirstName} {candidate.lastName}
                    </p>
                    {candidate.possibleDuplicate && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        POSSIBLE DUPLICATE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{candidate.user.email}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {candidate.skills.map((skill) => skill.name).join(' · ') || 'No skills listed'}
                  </p>
                </div>
                <button
                  disabled={!poolId}
                  onClick={() =>
                    send({
                      action: 'ADD_MEMBER',
                      talentPoolId: poolId,
                      candidateId: candidate.id,
                      sourceApplicationId: candidate.applications[0]?.id,
                      tags: candidate.skills.slice(0, 5).map((skill) => skill.name),
                    })
                  }
                  className="rounded-lg border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700 disabled:opacity-40"
                >
                  Add to selected pool
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
