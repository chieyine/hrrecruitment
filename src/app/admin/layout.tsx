import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import AdminNav, { type AdminNavGroup } from '@/components/admin/AdminNav'

const NAV_GROUPS: AdminNavGroup[] = [
  { label: 'Organization', items: [
    { href: '/admin/departments', label: 'Departments' }, { href: '/admin/projects', label: 'Projects' }, { href: '/admin/duty-stations', label: 'Locations' },
  ] },
  { label: 'Recruitment', items: [
    { href: '/admin/contract-types', label: 'Contracts' }, { href: '/admin/vacancy-categories', label: 'Categories' }, { href: '/admin/scorecards', label: 'Scorecards' }, { href: '/admin/assessment-bank', label: 'Assessments' }, { href: '/admin/interview-questions', label: 'Interview questions' },
  ] },
  { label: 'Preboarding', items: [
    { href: '/admin/document-types', label: 'Documents' }, { href: '/admin/forms', label: 'Forms' }, { href: '/admin/policies', label: 'Policies' }, { href: '/admin/courses', label: 'Courses' }, { href: '/admin/tasks', label: 'Tasks' }, { href: '/admin/preboarding-packages', label: 'Packages' },
  ] },
  { label: 'Communication', items: [
    { href: '/admin/notification-templates', label: 'Notifications' }, { href: '/admin/templates', label: 'Offers' },
  ] },
  { label: 'Control', items: [
    { href: '/admin/users', label: 'Users' }, { href: '/admin/roles', label: 'Roles' }, { href: '/admin/permissions', label: 'Permissions' }, { href: '/admin/system-settings', label: 'System' }, { href: '/admin/deletion-requests', label: 'Privacy' }, { href: '/admin/governance', label: 'Governance' }, { href: '/admin/operating-model', label: 'Operating model' },
  ] },
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
    : isCourseAdmin
      ? [{ label: 'Courses', items: [{ href: '/admin/courses', label: 'Course administration' }, { href: '/admin/configuration-releases', label: 'Course change drafts' }] }]
      : [{ label: 'Recruitment operations', items: [{ href: '/admin/automations', label: 'Automation controls' }] }]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href={isSystemAdmin ? '/admin/departments' : isCourseAdmin ? '/admin/courses' : '/admin/automations'} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Administration
          </Link>
          <AdminNav groups={nav} />
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
