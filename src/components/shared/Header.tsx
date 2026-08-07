'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogIn, LogOut, Menu, Search, Settings, X } from 'lucide-react'
import type { UserSession } from '@/lib/auth'
import { hasStaffRole, isCandidateOnly } from '@/lib/roles'
import { homeRouteForRoles } from '@/lib/home-route'

type NavLink = { href: string; label: string }
type NavGroup = { label: string; links: NavLink[] }

const PUBLIC_LINKS: NavLink[] = [
  { href: '/careers', label: 'Open roles' },
  { href: '/guidance', label: 'Our hiring process' },
  { href: '/recruitment-faq', label: 'Candidate help' },
  { href: '/complaints', label: 'Raise a concern' },
]

const STAFF_MORE_GROUPS: NavGroup[] = [
  {
    label: 'Plan and fund',
    links: [
      { href: '/recruitment/staffing-requests', label: 'Staffing requests' },
      { href: '/recruitment/funding', label: 'Funding confirmations' },
    ],
  },
  {
    label: 'Screen and shortlist',
    links: [
      { href: '/recruitment/longlisting', label: 'Longlisting' },
      { href: '/recruitment/longlisting/exceptions', label: 'Exception review' },
    ],
  },
  {
    label: 'Assess and decide',
    links: [
      { href: '/recruitment/assessments', label: 'Assessments' },
      { href: '/recruitment/interviews', label: 'Interviews' },
      { href: '/recruitment/references', label: 'References' },
      { href: '/recruitment/background-checks', label: 'Background checks' },
      { href: '/recruitment/selections', label: 'Selection decisions' },
    ],
  },
  {
    label: 'Offer and start',
    links: [
      { href: '/recruitment/offers', label: 'Offers' },
      { href: '/recruitment/preboarding', label: 'Starting steps' },
      { href: '/recruitment/erp-transfers', label: 'ERP handovers' },
      { href: '/recruitment/talent-pools', label: 'Talent pools' },
    ],
  },
  {
    label: 'Candidate support',
    links: [
      { href: '/recruitment/communications', label: 'Messages' },
      { href: '/recruitment/accommodations', label: 'Adjustments' },
      { href: '/recruitment/complaints', label: 'Concerns and complaints' },
    ],
  },
  {
    label: 'Review and report',
    links: [
      { href: '/recruitment/quality', label: 'Decision review' },
      { href: '/recruitment/reports', label: 'Reports' },
    ],
  },
]

const CANDIDATE_MORE_GROUPS: NavGroup[] = [
  {
    label: 'Your account',
    links: [
      { href: '/candidate/profile', label: 'Profile' },
      { href: '/candidate/preboarding', label: 'Before you start' },
      { href: '/candidate/settings', label: 'Account and privacy' },
    ],
  },
  {
    label: 'Help',
    links: [
      { href: '/candidate/accommodations', label: 'Request an adjustment' },
      { href: '/candidate/complaints', label: 'Raise a concern' },
    ],
  },
]

function routeIsActive(pathname: string, href: string) {
  return pathname === href || (href !== '/careers' && pathname.startsWith(`${href}/`))
}

function initials(email: string) {
  const value = email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim()
  if (!value) return 'FR'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Header({ currentUser }: { currentUser?: UserSession | null }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resolvedUser, setResolvedUser] = useState<UserSession | null | undefined>(currentUser)
  const pathname = usePathname()

  useEffect(() => {
    if (currentUser !== undefined) return

    const controller = new AbortController()
    fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data) => setResolvedUser(data.user || null))
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setResolvedUser(null)
      })

    return () => controller.abort()
  }, [currentUser])

  const isCandidate = Boolean(resolvedUser && isCandidateOnly(resolvedUser.roles))
  const isStaff = Boolean(resolvedUser && hasStaffRole(resolvedUser.roles))
  const isSystemAdmin = Boolean(resolvedUser?.roles.includes('SYSTEM_ADMIN'))
  const isOperationalStaff = isStaff && !isSystemAdmin
  const isHrManager = Boolean(resolvedUser?.roles.includes('HR_MANAGER'))
  const isRecruitmentOfficer = Boolean(resolvedUser?.roles.includes('RECRUITMENT_OFFICER'))
  const isCourseAdmin = Boolean(resolvedUser?.roles?.includes('COURSE_ADMIN') && !isSystemAdmin)
  const isApprover = Boolean(resolvedUser?.roles?.includes('APPROVER') && !resolvedUser.roles.includes('HR_MANAGER'))
  const isPanelOnly = Boolean(resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('PANEL_MEMBER'))
  const isAuditorOnly = Boolean(resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('AUDITOR'))
  const isBudgetHolderOnly = Boolean(
    resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('BUDGET_HOLDER')
  )
  const isHiringManagerOnly = Boolean(
    resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('HIRING_MANAGER')
  )
  const home = resolvedUser ? homeRouteForRoles(resolvedUser.roles) : '/careers'

  let primaryLinks: NavLink[] = PUBLIC_LINKS
  let secondaryGroups: NavGroup[] = []

  if (resolvedUser === undefined) {
    primaryLinks = []
  } else if (isCandidate) {
    primaryLinks = [
      { href: '/candidate/dashboard', label: 'Home' },
      { href: '/candidate/applications', label: 'Applications' },
      { href: '/candidate/tasks', label: 'To do' },
      { href: '/candidate/messages', label: 'Messages' },
    ]
    secondaryGroups = CANDIDATE_MORE_GROUPS
  } else if (isSystemAdmin) {
    primaryLinks = [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/roles', label: 'Roles' },
      { href: '/admin/system-settings', label: 'System' },
      { href: '/admin/governance', label: 'Governance' },
      { href: '/recruitment/audit', label: 'Audit trail' },
    ]
    secondaryGroups = [
      {
        label: 'Configuration',
        links: [{ href: '/admin/configuration-releases', label: 'Change drafts' }],
      },
    ]
  } else if (isCourseAdmin) {
    primaryLinks = [
      { href: '/admin/courses', label: 'Courses' },
      { href: '/admin/configuration-releases', label: 'Change drafts' },
    ]
  } else if (isApprover) {
    primaryLinks = [{ href: '/recruitment/approvals', label: 'My approvals' }]
  } else if (isPanelOnly) {
    primaryLinks = [{ href: '/recruitment/interviews', label: 'Assigned interviews' }]
  } else if (isAuditorOnly) {
    primaryLinks = [
      { href: '/recruitment/audit', label: 'Audit trail' },
      { href: '/recruitment/reports', label: 'Reports' },
    ]
  } else if (isBudgetHolderOnly) {
    // §3.7 The Budget Holder confirms money and nothing else.
    primaryLinks = [
      { href: '/recruitment/funding', label: 'Funding decisions' },
      { href: '/recruitment/staffing-requests', label: 'Staffing requests' },
    ]
  } else if (isHiringManagerOnly) {
    // §22.4 Hiring department view: own requests, assigned candidates, panels.
    primaryLinks = [
      { href: '/recruitment/staffing-requests', label: 'My requests' },
      { href: '/recruitment/applications', label: 'Assigned candidates' },
      { href: '/recruitment/interviews', label: 'Interviews' },
    ]
  } else if (isStaff) {
    primaryLinks = [
      { href: '/recruitment/dashboard', label: 'Home' },
      { href: '/recruitment/work', label: 'My work' },
      { href: '/recruitment/vacancies', label: 'Vacancies' },
      { href: '/recruitment/applications', label: 'Candidates' },
    ]
    secondaryGroups = STAFF_MORE_GROUPS
  }
  const secondaryLinks = secondaryGroups.flatMap((group) => group.links)

  const accountLabel = isCandidate
    ? 'Candidate'
    : isSystemAdmin
      ? 'System administrator'
      : isCourseAdmin
        ? 'Course administrator'
        : isHrManager
          ? 'HR manager'
          : isRecruitmentOfficer
            ? 'Recruitment / HR officer'
            : isApprover
              ? 'Approver'
              : isPanelOnly
                ? 'Panel member'
                : isAuditorOnly
                  ? 'Auditor'
                  : isBudgetHolderOnly
                    ? 'Budget holder'
                    : isHiringManagerOnly
                      ? 'Hiring manager'
                      : 'Recruitment staff'

  const signOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/auth/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="h-1 bg-brand-950" />
      <div className="page-shell flex h-[70px] items-center justify-between gap-6">
        <Link
          href={home}
          onClick={() => setOpen(false)}
          aria-label={
            resolvedUser ? (isCandidate ? 'Candidate overview' : 'Recruitment') : 'FRAD Foundation recruitment'
          }
          className="group flex shrink-0 items-center gap-3"
        >
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-brand-950 font-display text-lg text-white shadow-sm transition-transform group-hover:-translate-y-px">
            F
          </span>
          <span className="leading-none">
            <span className="block text-sm font-bold tracking-[-0.02em] text-navy-900">FRAD Foundation</span>
            <span className="mt-1.5 block text-[9px] font-bold uppercase tracking-[0.17em] text-stone-500">
              {isSystemAdmin
                ? 'Platform administration'
                : isStaff
                  ? 'Recruitment'
                  : isCandidate
                    ? 'Candidate portal'
                    : 'People & careers'}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden min-w-0 items-center gap-1 lg:flex">
          {primaryLinks.map((link) => {
            const active = routeIsActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  active ? 'bg-brand-100 text-brand-950' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-900'
                }`}
              >
                {link.label}
              </Link>
            )
          })}

          {secondaryLinks.length > 0 && (
            <details className="group relative">
              <summary
                className={`flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition [&::-webkit-details-marker]:hidden ${
                  secondaryLinks.some((link) => routeIsActive(pathname, link.href))
                    ? 'bg-brand-100 text-brand-950'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-navy-900'
                }`}
              >
                More <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[620px] rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_20px_60px_rgba(16,24,20,.16)]">
                <div className="grid grid-cols-2 gap-3">
                  {secondaryGroups.map((group) => (
                    <div key={group.label} className="rounded-xl bg-stone-50/70 p-2">
                      <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                        {group.label}
                      </p>
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block rounded-lg px-2 py-2 text-sm font-medium ${
                            routeIsActive(pathname, link.href)
                              ? 'bg-brand-100 text-brand-950'
                              : 'text-stone-700 hover:bg-white hover:text-navy-900'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
                {isOperationalStaff && (
                  <div className="mt-3 flex items-center gap-2 border-t border-stone-200 pt-3">
                    <Link
                      href="/recruitment/search"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      <Search className="h-4 w-4 text-stone-400" /> Search all records
                    </Link>
                    {resolvedUser?.roles.some((role) => ['RECRUITMENT_OFFICER', 'HR_MANAGER'].includes(role)) && (
                      <Link
                        href={resolvedUser.roles.includes('HR_MANAGER') ? '/admin/projects' : '/admin/automations'}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <Settings className="h-4 w-4 text-stone-400" />{' '}
                        {resolvedUser.roles.includes('HR_MANAGER') ? 'Recruitment setup' : 'Automation'}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </details>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {resolvedUser ? (
            <>
              <div className="hidden items-center gap-2.5 border-l border-stone-200 pl-4 xl:flex">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">
                  {initials(resolvedUser.email)}
                </span>
                <span className="max-w-40 leading-tight">
                  <span className="block truncate text-xs font-semibold text-navy-900">{resolvedUser.email}</span>
                  <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.09em] text-stone-500">
                    {accountLabel}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="hidden h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-stone-400 hover:text-navy-900 xl:inline-flex"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : resolvedUser === null ? (
            <>
              <Link
                href="/auth/login"
                className="hidden px-3 py-2 text-sm font-semibold text-stone-700 hover:text-brand-800 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link href="/auth/register" className="btn-primary hidden min-h-10 px-4 py-2 text-xs sm:inline-flex">
                Create account
              </Link>
            </>
          ) : (
            <span className="hidden h-9 w-28 animate-pulse rounded-lg bg-stone-100 sm:block" aria-hidden />
          )}

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-stone-300 bg-white text-navy-800 hover:bg-stone-50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-stone-200 bg-white px-4 py-4 shadow-xl lg:hidden"
        >
          {resolvedUser && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-stone-50 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">
                {initials(resolvedUser.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{resolvedUser.email}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-stone-500">{accountLabel}</p>
              </div>
            </div>
          )}

          <div className="grid gap-1 sm:grid-cols-2">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={routeIsActive(pathname, link.href) ? 'page' : undefined}
                className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                  routeIsActive(pathname, link.href)
                    ? 'bg-brand-100 text-brand-950'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {secondaryGroups.map((group) => (
            <div key={group.label} className="mt-4 border-t border-stone-200 pt-3">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                {group.label}
              </p>
              <div className="grid gap-1 sm:grid-cols-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={routeIsActive(pathname, link.href) ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      routeIsActive(pathname, link.href)
                        ? 'bg-brand-100 text-brand-950'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {isOperationalStaff && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3">
              <Link
                href="/recruitment/search"
                onClick={() => setOpen(false)}
                className="btn-secondary min-h-10 px-3 py-2 text-xs"
              >
                <Search className="h-4 w-4" /> Search
              </Link>
              {resolvedUser?.roles.some((role) => ['RECRUITMENT_OFFICER', 'HR_MANAGER'].includes(role)) && (
                <Link
                  href={resolvedUser.roles.includes('HR_MANAGER') ? '/admin/projects' : '/admin/automations'}
                  onClick={() => setOpen(false)}
                  className="btn-secondary min-h-10 px-3 py-2 text-xs"
                >
                  <Settings className="h-4 w-4" />{' '}
                  {resolvedUser.roles.includes('HR_MANAGER') ? 'Recruitment setup' : 'Automation'}
                </Link>
              )}
            </div>
          )}

          {resolvedUser === null && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="btn-secondary min-h-10 px-3 py-2 text-xs"
              >
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="btn-primary min-h-10 px-3 py-2 text-xs"
              >
                Create account
              </Link>
            </div>
          )}

          {resolvedUser && (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="btn-secondary mt-3 w-full min-h-10 px-3 py-2 text-xs"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
