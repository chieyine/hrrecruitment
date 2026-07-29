'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Loader2, Plus, Search, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Dialog, ReasonDialog } from '@/components/ui/Dialog'

const STAFF_ROLES = [
  'RECRUITMENT_OFFICER',
  'HR_MANAGER',
  'HIRING_MANAGER',
  'APPROVER',
  'PANEL_MEMBER',
  'COURSE_ADMIN',
  'SYSTEM_ADMIN',
  'AUDITOR',
]

const ROLE_LABELS: Record<string, string> = {
  RECRUITMENT_OFFICER: 'Recruitment officer',
  HR_MANAGER: 'HR manager',
  HIRING_MANAGER: 'Hiring manager',
  APPROVER: 'Approver',
  PANEL_MEMBER: 'Panel member',
  COURSE_ADMIN: 'Course administrator',
  SYSTEM_ADMIN: 'System administrator',
  AUDITOR: 'Auditor',
}

function when(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value))
}

export default function UserManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [accessTarget, setAccessTarget] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [reasonTarget, setReasonTarget] = useState<
    | { kind: 'role'; user: any; assignment: any }
    | { kind: 'status'; user: any; status: 'ACTIVE' | 'SUSPENDED' }
    | null
  >(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch('/api/admin/generic?entity=users&staffOnly=1'),
        fetch('/api/admin/generic?entity=roles'),
      ])
      const [userData, roleData] = await Promise.all([usersResponse.json(), rolesResponse.json()])
      if (!usersResponse.ok) throw new Error(userData.error || 'Staff accounts could not be loaded')
      if (!rolesResponse.ok) throw new Error(roleData.error || 'Roles could not be loaded')
      setUsers(userData.items || [])
      setRoles((roleData.items || []).filter((role: any) => STAFF_ROLES.includes(role.name)))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Staff accounts could not be loaded')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(term) ||
        user.userRoles.some((assignment: any) =>
          (ROLE_LABELS[assignment.role.name] || assignment.role.name).toLowerCase().includes(term)
        )
    )
  }, [query, users])

  const change = async (id: string, data: Record<string, unknown>) => {
    setError('')
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Access could not be changed')
    await load()
  }

  async function addRole() {
    if (!accessTarget || !selectedRole) return
    try {
      await change(accessTarget.id, { roleId: selectedRole })
      setAccessTarget(null)
      setSelectedRole('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Access could not be changed')
    }
  }

  async function confirmReason(reason: string) {
    if (!reasonTarget) return
    try {
      if (reasonTarget.kind === 'role') {
        await change(reasonTarget.user.id, { removeAssignmentId: reasonTarget.assignment.id, reason })
      } else {
        await change(reasonTarget.user.id, { accountStatus: reasonTarget.status, reason })
      }
      setReasonTarget(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Access could not be changed')
    }
  }

  return (
    <div className="space-y-6">
      <header className="grid gap-5 border-b border-stone-200 pb-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Access administration</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-navy-950">Staff accounts</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Assign the smallest role a colleague needs. Vacancy, approval and panel assignments are managed in the
            recruitment workspace, not by widening account access here.
          </p>
        </div>
        <div className="border-l-2 border-brand-600 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-950">
            <ShieldCheck className="h-4 w-4 text-brand-700" /> Separate technical accounts
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            A system administrator account cannot also hold an HR or recruitment role. Staff accounts are provisioned
            through FRAD’s controlled identity process.
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label className="relative block max-w-sm flex-1">
          <span className="sr-only">Search staff accounts</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email or role"
            className="field-control pl-9"
          />
        </label>
        <p className="text-xs font-medium text-stone-500">{visible.length} staff accounts</p>
      </div>

      <div className="overflow-hidden border-y border-stone-200 bg-white shadow-sm sm:rounded-2xl sm:border">
        {loading ? (
          <div className="py-16 text-center text-stone-500">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            <p className="mt-2 text-xs">Loading staff access…</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-stone-500">No staff accounts match this search.</p>
        ) : (
          visible.map((user, index) => {
            const isSelf = user.id === currentUserId
            const active = user.accountStatus === 'ACTIVE'
            return (
              <article
                key={user.id}
                className={`grid gap-5 px-5 py-5 lg:grid-cols-[minmax(15rem,0.9fr)_minmax(20rem,1.3fr)_11rem] lg:px-6 ${
                  index ? 'border-t border-stone-200' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <UserRoundCheck className="h-4 w-4 text-brand-700" />
                    <h3 className="break-all text-sm font-semibold text-navy-950">{user.email}</h3>
                    {isSelf && <span className="text-[10px] font-bold uppercase text-stone-500">You</span>}
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Last sign-in: {when(user.lastLoginAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Access</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.userRoles.map((assignment: any) => (
                      <span
                        key={assignment.id}
                        className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900"
                      >
                        {ROLE_LABELS[assignment.role.name] || assignment.role.name}
                        {!isSelf && (
                          <button
                            type="button"
                            aria-label={`Remove ${ROLE_LABELS[assignment.role.name] || assignment.role.name}`}
                            onClick={() => setReasonTarget({ kind: 'role', user, assignment })}
                            className="text-brand-700 hover:text-rose-700"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAccessTarget(user)
                        setSelectedRole('')
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-brand-400 hover:text-brand-800"
                    >
                      <Plus className="h-3 w-3" /> Add access
                    </button>
                  </div>
                </div>
                <div className="lg:text-right">
                  <span
                    className={`status-chip ${
                      active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    {active ? 'Active' : user.accountStatus.toLowerCase()}
                  </span>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() =>
                        setReasonTarget({ kind: 'status', user, status: active ? 'SUSPENDED' : 'ACTIVE' })
                      }
                      className="mt-2 block text-xs font-semibold text-stone-600 hover:text-brand-800 lg:ml-auto"
                    >
                      {active ? 'Suspend account' : 'Restore account'}
                    </button>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>

      <Dialog open={Boolean(accessTarget)} onClose={() => setAccessTarget(null)} title="Add staff access">
        <div className="space-y-5">
          <div className="flex items-start gap-3 border-l-2 border-brand-600 bg-brand-50 px-4 py-3">
            <KeyRound className="mt-0.5 h-4 w-4 text-brand-700" />
            <p className="text-xs leading-5 text-brand-950">
              This gives {accessTarget?.email} access across the role’s workspace. Use vacancy and panel assignments
              for case-specific participation.
            </p>
          </div>
          <label className="block">
            <span className="field-label">Role</span>
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="field-control">
              <option value="">Choose a role</option>
              {roles
                .filter((role) => !accessTarget?.userRoles.some((assignment: any) => assignment.roleId === role.id))
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {ROLE_LABELS[role.name] || role.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAccessTarget(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="button" disabled={!selectedRole} onClick={() => void addRole()} className="btn-primary">
              Add access
            </button>
          </div>
        </div>
      </Dialog>

      <ReasonDialog
        open={Boolean(reasonTarget)}
        onClose={() => setReasonTarget(null)}
        onConfirm={(reason) => void confirmReason(reason)}
        title={
          reasonTarget?.kind === 'role'
            ? 'Remove staff access'
            : reasonTarget?.status === 'ACTIVE'
              ? 'Restore account'
              : 'Suspend account'
        }
        description={
          reasonTarget?.kind === 'role'
            ? 'The user’s active sessions will end and this role will no longer be available.'
            : reasonTarget?.status === 'ACTIVE'
              ? 'The user will be able to sign in again.'
              : 'The user’s active sessions will end immediately.'
        }
        confirmLabel={
          reasonTarget?.kind === 'role'
            ? 'Remove access'
            : reasonTarget?.status === 'ACTIVE'
              ? 'Restore account'
              : 'Suspend account'
        }
        reasonLabel="Reason"
        reasonRequired
        tone={reasonTarget?.kind === 'status' && reasonTarget.status === 'ACTIVE' ? 'default' : 'danger'}
      />
    </div>
  )
}
