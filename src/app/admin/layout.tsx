import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import AdminNav, { type AdminNavGroup } from '@/components/admin/AdminNav'

const SYSTEM_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Access',
    items: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/roles', label: 'Roles' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/system-settings', label: 'System settings' },
    ],
  },
  {
    label: 'Assurance',
    items: [
      { href: '/admin/deletion-requests', label: 'Privacy requests' },
      { href: '/admin/governance', label: 'Governance' },
    ],
  },
]

const RECRUITMENT_SETUP_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Organisation',
    items: [
      { href: '/admin/departments', label: 'Departments' },
      { href: '/admin/projects', label: 'Projects' },
      { href: '/admin/duty-stations', label: 'Locations' },
    ],
  },
  {
    label: 'Vacancies',
    items: [
      { href: '/admin/contract-types', label: 'Contract types' },
      { href: '/admin/vacancy-categories', label: 'Job families' },
      { href: '/admin/document-types', label: 'Document types' },
      { href: '/admin/document-requirements', label: 'Document requirements' },
    ],
  },
  {
    label: 'Selection',
    items: [{ href: '/admin/scorecards', label: 'Scorecards' }],
  },
  {
    label: 'Offer and start',
    items: [
      { href: '/admin/templates', label: 'Offer letters' },
      { href: '/admin/notification-templates', label: 'Message templates' },
      { href: '/admin/forms', label: 'Forms' },
      { href: '/admin/policies', label: 'Policies' },
      { href: '/admin/tasks', label: 'Additional requests' },
      { href: '/admin/preboarding-packages', label: 'Preboarding packages' },
    ],
  },
  {
    label: 'Controlled changes',
    items: [
      { href: '/admin/operating-model', label: 'Work targets' },
      { href: '/admin/configuration-releases', label: 'Review drafts' },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const isSystemAdmin = user.roles.includes('SYSTEM_ADMIN')
  const isCourseAdmin = user.roles.includes('COURSE_ADMIN')
  const isHrManager = user.roles.includes('HR_MANAGER')
  const isRecruitmentOfficer = user.roles.includes('RECRUITMENT_OFFICER')
  if (!isSystemAdmin && !isCourseAdmin && !isHrManager && !isRecruitmentOfficer) redirect('/recruitment/dashboard')
  const recruitmentOperationsNav: AdminNavGroup[] = [
    {
      label: 'Recruitment operations',
      items: [
        { href: '/admin/automations', label: 'Automation schedules' },
        { href: '/admin/fraud-reports', label: 'Fraud reports' },
      ],
    },
  ]
  const courseNav: AdminNavGroup[] = [
    {
      label: 'Learning',
      items: [
        { href: '/admin/courses', label: 'Courses' },
        { href: '/admin/configuration-releases', label: 'Review course drafts' },
      ],
    },
  ]
  const nav = isSystemAdmin
    ? SYSTEM_NAV_GROUPS
    : [
        ...(isHrManager ? RECRUITMENT_SETUP_NAV_GROUPS : []),
        ...(isCourseAdmin ? courseNav : []),
        ...(isHrManager || isRecruitmentOfficer ? recruitmentOperationsNav : []),
      ]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell">
          <div className="mb-5 flex items-end justify-between border-b border-stone-200 pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">Administration</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-navy-900">
                {isSystemAdmin
                  ? 'Platform administration'
                  : isHrManager
                    ? 'Recruitment configuration'
                    : isCourseAdmin
                      ? 'Learning configuration'
                      : 'Recruitment operations'}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                {isSystemAdmin
                  ? 'Access, infrastructure, privacy and technical controls.'
                  : isHrManager
                    ? 'The reference data and templates used throughout recruitment.'
                    : isCourseAdmin
                      ? 'Courses, content, questions and controlled course changes.'
                      : 'Case queues, schedules and day-to-day recruitment controls.'}
              </p>
            </div>
            {!isSystemAdmin && (
              <Link href="/recruitment/dashboard" className="btn-secondary min-h-10 px-4 py-2 text-xs">
                <ArrowLeft className="h-4 w-4" /> Recruitment overview
              </Link>
            )}
          </div>
          <AdminNav
            groups={nav}
            label={
              isSystemAdmin
                ? 'Platform controls'
                : isHrManager
                  ? 'Recruitment configuration'
                  : isCourseAdmin
                    ? 'Learning configuration'
                    : 'Recruitment operations'
            }
          />
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
