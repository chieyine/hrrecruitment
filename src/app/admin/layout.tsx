import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import AdminNav, { type AdminNavGroup } from '@/components/admin/AdminNav'

const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Organization',
    items: [
      { href: '/admin/departments', label: 'Departments' },
      { href: '/admin/projects', label: 'Projects' },
      { href: '/admin/duty-stations', label: 'Locations' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { href: '/admin/contract-types', label: 'Contracts' },
      { href: '/admin/vacancy-categories', label: 'Categories' },
      { href: '/admin/scorecards', label: 'Scorecards' },
      { href: '/admin/assessment-bank', label: 'Assessments' },
      { href: '/admin/interview-questions', label: 'Interview questions' },
    ],
  },
  {
    label: 'Preboarding',
    items: [
      { href: '/admin/document-types', label: 'Document types' },
      { href: '/admin/document-requirements', label: 'Document requirements' },
      { href: '/admin/forms', label: 'Forms' },
      { href: '/admin/policies', label: 'Policies' },
      { href: '/admin/courses', label: 'Courses' },
      { href: '/admin/tasks', label: 'Tasks' },
      { href: '/admin/preboarding-packages', label: 'Packages' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/admin/notification-templates', label: 'Notifications' },
      { href: '/admin/templates', label: 'Offers' },
    ],
  },
  {
    label: 'Control',
    items: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/roles', label: 'Roles' },
      { href: '/admin/permissions', label: 'Permissions' },
      { href: '/admin/system-settings', label: 'System' },
      { href: '/admin/deletion-requests', label: 'Privacy' },
      { href: '/admin/governance', label: 'Governance' },
      { href: '/admin/operating-model', label: 'Operating model' },
      { href: '/admin/fraud-reports', label: 'Fraud reports' },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const isSystemAdmin = user.roles.includes('SYSTEM_ADMIN')
  const isCourseAdmin = user.roles.includes('COURSE_ADMIN')
  const isHrManager = user.roles.includes('HR_MANAGER')
  if (!isSystemAdmin && !isCourseAdmin && !isHrManager) redirect('/recruitment/dashboard')
  const nav = isSystemAdmin
    ? NAV_GROUPS
    : isCourseAdmin && !isHrManager
      ? [
          {
            label: 'Courses',
            items: [
              { href: '/admin/courses', label: 'Course administration' },
              { href: '/admin/configuration-releases', label: 'Course change drafts' },
            ],
          },
        ]
      : [
          {
            label: 'Recruitment setup',
            items: [
              { href: '/admin/departments', label: 'Departments' },
              { href: '/admin/projects', label: 'Projects' },
              { href: '/admin/duty-stations', label: 'Locations' },
              { href: '/admin/contract-types', label: 'Contracts' },
              { href: '/admin/vacancy-categories', label: 'Categories' },
              { href: '/admin/document-types', label: 'Document types' },
              { href: '/admin/document-requirements', label: 'Document requirements' },
            ],
          },
          {
            label: 'Recruitment operations',
            items: [
              { href: '/admin/automations', label: 'Automation schedules' },
              { href: '/admin/fraud-reports', label: 'Fraud reports' },
            ],
          },
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
                Recruitment configuration
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                Reference data, permissions, templates and operational controls.
              </p>
            </div>
            <Link href="/recruitment/dashboard" className="btn-secondary min-h-10 px-4 py-2 text-xs">
              <ArrowLeft className="h-4 w-4" /> Recruitment overview
            </Link>
          </div>
          <AdminNav groups={nav} />
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
