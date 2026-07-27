'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogIn, LogOut, Menu, X } from 'lucide-react'
import type { UserSession } from '@/lib/auth'
import { hasStaffRole, isCandidateOnly } from '@/lib/roles'
import { homeRouteForRoles } from '@/lib/home-route'

const PUBLIC_LINKS = [
  { href: '/careers', label: 'Vacancies' },
  { href: '/recruitment-process', label: 'How we recruit' },
  { href: '/recruitment-faq', label: 'Help for candidates' },
  { href: '/complaints', label: 'Raise a concern' },
]

export default function Header({ currentUser }: { currentUser?: UserSession | null }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resolvedUser, setResolvedUser] = useState<UserSession | null | undefined>(currentUser)
  const pathname = usePathname()

  useEffect(() => {
    if (currentUser !== undefined) return

    const controller = new AbortController()
    fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((data) => setResolvedUser(data.user || null))
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setResolvedUser(null)
      })

    return () => controller.abort()
  }, [currentUser])

  const isCandidate = Boolean(resolvedUser && isCandidateOnly(resolvedUser.roles))
  const isStaff = Boolean(resolvedUser && hasStaffRole(resolvedUser.roles))
  const isCourseAdmin = Boolean(resolvedUser?.roles?.includes('COURSE_ADMIN') && !resolvedUser.roles.includes('SYSTEM_ADMIN'))
  const isApprover = Boolean(resolvedUser?.roles?.includes('APPROVER') && !resolvedUser.roles.includes('HR_MANAGER'))
  const isPanelOnly = Boolean(resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('PANEL_MEMBER'))
  const isAuditorOnly = Boolean(resolvedUser?.roles?.length === 1 && resolvedUser.roles.includes('AUDITOR'))
  const home = resolvedUser ? homeRouteForRoles(resolvedUser.roles) : '/careers'
  const navLinks = resolvedUser && (isCandidate || isStaff)
    ? isCandidate
      ? [
          { href: '/candidate/tasks', label: 'Actions' },
          { href: '/candidate/applications', label: 'Applications' },
          { href: '/candidate/messages', label: 'Messages' },
          { href: '/candidate/profile', label: 'Profile' },
          // Previously unreachable: a candidate could raise a concern from the
          // public page but had no route to their own complaint history, and no
          // route to account security or privacy settings.
          { href: '/candidate/complaints', label: 'My concerns' },
          { href: '/candidate/settings', label: 'Settings' },
        ]
      : isCourseAdmin
        ? [
            { href: '/admin/courses', label: 'Course administration' },
          ]
        : isApprover
          ? [{ href: '/recruitment/approvals', label: 'My approvals' }]
          : isPanelOnly
            ? [{ href: '/recruitment/interviews', label: 'Assigned interviews' }]
          : isAuditorOnly
            ? [{ href: '/recruitment/audit', label: 'Audit trail' }, { href: '/recruitment/reports', label: 'Reports' }]
        : [
          { href: '/recruitment/dashboard', label: 'Dashboard' },
          { href: '/recruitment/work', label: 'My work' },
          { href: '/recruitment/vacancies', label: 'Vacancies' },
          { href: '/recruitment/applications', label: 'Candidates' },
          // Selections is the weighted-ranking decision screen the whole
          // pipeline feeds; it had no navigation entry at all.
          { href: '/recruitment/selections', label: 'Selections' },
          { href: '/recruitment/search', label: 'Search' },
          { href: '/recruitment/reports', label: 'Reports' },
          ...(resolvedUser.roles.includes('SYSTEM_ADMIN') || resolvedUser.roles.includes('HR_MANAGER')
            ? [{ href: '/admin/projects', label: 'Administration' }]
            : []),
        ]
    : PUBLIC_LINKS

  const signOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/auth/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur">
      <a href="#main-content" className="sr-only z-[60] bg-white px-4 py-3 font-bold text-brand-900 focus:not-sr-only focus:absolute focus:left-3 focus:top-3">
        Skip to main content
      </a>
      <div className="h-0.5 bg-brand-700" />
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={home} aria-label={resolvedUser ? isCandidate ? 'Candidate account' : 'Staff workspace' : 'FRAD careers'} className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-brand-700 font-display text-base text-white">
            F
          </div>
          <div className="leading-none">
            <span className="block font-display text-xl tracking-[-0.02em] text-navy-900">FRAD</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
              Recruitment
            </span>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-5 text-[13px] font-semibold text-stone-600 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href || (link.href !== '/careers' && pathname.startsWith(`${link.href}/`)) ? 'page' : undefined} className={`border-b-2 py-2 transition-colors ${pathname === link.href || (link.href !== '/careers' && pathname.startsWith(`${link.href}/`)) ? 'border-brand-700 text-stone-950' : 'border-transparent hover:border-brand-300 hover:text-stone-950'}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {resolvedUser ? (
            <>
              <div className="hidden text-right xl:block">
                <p className="max-w-44 truncate text-xs font-semibold text-stone-800">{resolvedUser.email}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-stone-500">{isCandidate ? 'Candidate' : isCourseAdmin ? 'Course administrator' : isApprover ? 'Approver' : isPanelOnly ? 'Panel member' : isAuditorOnly ? 'Auditor' : 'Staff account'}</p>
              </div>
              <button type="button" onClick={signOut} disabled={signingOut} className="btn-secondary hidden px-4 py-2.5 sm:inline-flex disabled:opacity-50">
                <LogOut className="mr-2 h-4 w-4" />{signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : resolvedUser === null ? (
            <>
              <Link
                href="/login"
                className="hidden items-center gap-1.5 px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:text-brand-700 sm:flex"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary hidden px-5 py-2.5 sm:inline-flex"
              >
                Create account
              </Link>
            </>
          ) : null}

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
            className="rounded-md border border-surface-200 p-2.5 text-navy-800 hover:bg-surface-50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="space-y-1 border-t border-surface-200 bg-white px-4 py-4 lg:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`block border-b border-surface-200 px-2 py-3 text-sm font-semibold ${pathname === link.href ? 'text-brand-800' : 'text-navy-800 hover:text-brand-700'}`}
            >
              {link.label}
            </Link>
          ))}
          {resolvedUser === null && (
            <div className="flex gap-2 pt-3">
              <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className="btn-primary flex-1 justify-center">
                Create account
              </Link>
            </div>
          )}
          {resolvedUser && (
            <button type="button" onClick={signOut} disabled={signingOut} className="btn-secondary mt-3 flex w-full justify-center disabled:opacity-50">
              <LogOut className="mr-2 h-4 w-4" />{signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
