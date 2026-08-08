import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Users } from 'lucide-react'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ROLE_ORDER = [
  'RECRUITMENT_OFFICER',
  'HR_MANAGER',
  'HIRING_MANAGER',
  'BUDGET_HOLDER',
  'APPROVER',
  'PANEL_MEMBER',
  'SYSTEM_ADMIN',
  'AUDITOR',
] as const

const ROLE_GUIDANCE: Record<
  (typeof ROLE_ORDER)[number],
  { name: string; purpose: string; boundary: string; group: 'Recruitment' | 'Specialist' | 'Technical' }
> = {
  RECRUITMENT_OFFICER: {
    name: 'Recruitment officer',
    purpose: 'Runs vacancies, candidate records, interviews, references, offers and preboarding from day to day.',
    boundary: 'Does not approve vacancies, offers, waivers or final preboarding clearance.',
    group: 'Recruitment',
  },
  HR_MANAGER: {
    name: 'HR manager',
    purpose: 'Owns recruitment policy, preboarding courses, controlled configuration and HR leadership decisions.',
    boundary: 'Approval is a decision responsibility, not a substitute for the recruitment officer’s daily work.',
    group: 'Recruitment',
  },
  HIRING_MANAGER: {
    name: 'Hiring manager',
    purpose: 'Reviews candidates and contributes to selection for vacancies they own or have been assigned.',
    boundary: 'Cannot browse unrelated candidates or administer recruitment settings.',
    group: 'Recruitment',
  },
  BUDGET_HOLDER: {
    name: 'Budget holder',
    purpose: 'Confirms funding, ceilings and budget lines for approved staffing requests.',
    boundary: 'Cannot browse candidate records, scores, checks or offers.',
    group: 'Specialist',
  },
  APPROVER: {
    name: 'Approver',
    purpose: 'Makes the specific vacancy or offer decisions routed to them.',
    boundary: 'Access comes from an assigned approval; the role does not provide a general recruitment workspace.',
    group: 'Specialist',
  },
  PANEL_MEMBER: {
    name: 'Panel member',
    purpose: 'Reviews assigned interview material and submits their own assessment.',
    boundary: 'Cannot see unrelated applications, other panels or administrative records.',
    group: 'Specialist',
  },
  SYSTEM_ADMIN: {
    name: 'System administrator',
    purpose: 'Maintains accounts, access and technical platform controls.',
    boundary: 'Must use a separate operational account for recruitment decisions or candidate handling.',
    group: 'Technical',
  },
  AUDITOR: {
    name: 'Auditor',
    purpose: 'Reviews recruitment records, audit evidence and approved reports without changing them.',
    boundary: 'Read-only access; cannot progress candidates or alter configuration.',
    group: 'Technical',
  },
}

const PERMISSION_LABELS: Record<string, string> = {
  'vacancy.create.all': 'Create vacancies',
  'vacancy.read.all': 'Read all vacancies',
  'vacancy.read.assigned': 'Read assigned vacancies',
  'vacancy.update.all': 'Update vacancies',
  'application.read.assigned': 'Read assigned applications',
  'application.read.all': 'Read all applications',
  'application.stage.change': 'Move applications',
  'scorecard.submit': 'Submit scorecards',
  'scorecard.reopen': 'Reopen scorecards with a reason',
  'assessment.manage': 'Manage assessments',
  'interview.manage': 'Manage interviews',
  'interview.score.assigned': 'Score assigned interviews',
  'reference.manage': 'Manage references',
  'offer.manage': 'Prepare offers',
  'preboarding.manage': 'Manage preboarding',
  'preboarding.clearance': 'Issue final clearance',
  'resumption.confirm': 'Confirm resumption',
  'course.manage': 'Manage courses',
  'preboarding.restricted.read': 'Read restricted preboarding records',
  'erp.transfer': 'Record HR system transfer',
  'admin.manage': 'Manage platform settings',
  'audit.read': 'Read audit evidence',
  'report.export': 'Export reports',
  'complaint.manage': 'Manage restricted cases',
  'governance.manage': 'Manage governance controls',
}

export default async function AdminRolesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('SYSTEM_ADMIN')) redirect('/recruitment/dashboard')

  const roles = await prisma.role.findMany({
    where: { name: { in: [...ROLE_ORDER] } },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  })
  const roleMap = new Map(roles.map((role) => [role.name, role]))

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-stone-200 pb-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Access model</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-navy-950">
            Clear responsibilities, limited access
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
            Roles are fixed so staff receive the access their work requires—nothing more. Assign roles from the Users
            page; vacancy and interview assignments narrow access further.
          </p>
          <Link href="/admin/users" className="btn-primary mt-5 min-h-11 px-5">
            Manage user access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="border-l-2 border-brand-600 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-950">
            <LockKeyhole className="h-4 w-4 text-brand-700" />
            Product-defined roles
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Names and capabilities cannot be edited here. This prevents a settings change from silently widening access
            across the service.
          </p>
        </div>
      </section>

      {(['Recruitment', 'Specialist', 'Technical'] as const).map((group) => {
        const groupRoles = ROLE_ORDER.filter((name) => ROLE_GUIDANCE[name].group === group)
        return (
          <section key={group} aria-labelledby={`roles-${group.toLowerCase()}`}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 id={`roles-${group.toLowerCase()}`} className="text-lg font-semibold text-navy-950">
                {group} roles
              </h3>
              <span className="text-xs text-stone-500">{groupRoles.length} defined</span>
            </div>
            <div className="overflow-hidden border-y border-stone-200 bg-white shadow-sm sm:rounded-2xl sm:border">
              {groupRoles.map((roleName, index) => {
                const guidance = ROLE_GUIDANCE[roleName]
                const role = roleMap.get(roleName)
                const permissions =
                  role?.rolePermissions
                    .map(
                      ({ permission }) =>
                        PERMISSION_LABELS[permission.code] || permission.description || permission.code
                    )
                    .sort((a, b) => a.localeCompare(b)) || []
                return (
                  <article
                    key={roleName}
                    className={`grid gap-5 p-5 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(17rem,0.8fr)] lg:p-6 ${
                      index ? 'border-t border-stone-200' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {group === 'Recruitment' ? (
                          <Users className="h-4 w-4 text-brand-700" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-brand-700" />
                        )}
                        <h4 className="font-semibold text-navy-950">{guidance.name}</h4>
                      </div>
                      <p className="mt-2 text-xs font-medium text-stone-500">
                        {role?._count.userRoles || 0} active assignment{role?._count.userRoles === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm leading-6 text-stone-700">{guidance.purpose}</p>
                      <p className="mt-2 text-sm leading-6 text-stone-500">
                        <span className="font-semibold text-stone-700">Limit: </span>
                        {guidance.boundary}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                        Recorded capabilities
                      </p>
                      {permissions.length ? (
                        <ul className="mt-2 grid gap-1.5">
                          {permissions.map((permission) => (
                            <li key={permission} className="flex gap-2 text-xs leading-5 text-stone-600">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
                              {permission}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-stone-500">
                          Access is granted only when a decision is assigned.
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <aside className="flex gap-3 border-t border-stone-200 pt-5 text-sm leading-6 text-stone-600">
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-700" />
        <p>
          Candidate, referee and public identities are created by their own service journeys. They are not staff roles
          and should never be assigned from the administration area.
        </p>
      </aside>
    </div>
  )
}
