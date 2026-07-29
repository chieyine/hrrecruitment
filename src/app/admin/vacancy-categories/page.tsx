import { redirect } from 'next/navigation'
import AdminCrud from '@/components/admin/AdminCrud'
import { getVerifiedUser } from '@/lib/auth'

export default async function VacancyCategoriesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('HR_MANAGER')) {
    redirect(user.roles.includes('SYSTEM_ADMIN') ? '/admin/system-settings' : '/recruitment/dashboard')
  }

  return (
    <AdminCrud
      entity="vacancy-categories"
      title="Job families"
      subtitle="A consistent way for candidates and HR to group similar work across teams."
      columns={[
        { name: 'name', label: 'Job family' },
        { name: 'code', label: 'Reporting code' },
        { name: '_count.vacancies', label: 'Vacancies' },
        { name: 'active', label: 'Available' },
      ]}
      fields={[
        {
          name: 'name',
          label: 'Job family',
          required: true,
          placeholder: 'For example, Monitoring, evaluation and learning',
        },
        {
          name: 'code',
          label: 'Reporting code',
          required: true,
          placeholder: 'For example, MEAL',
          helpText: 'A stable uppercase code used in exports. It cannot change after a vacancy uses it.',
        },
        {
          name: 'active',
          label: 'Available for new vacancies',
          type: 'checkbox',
          defaultValue: true,
        },
      ]}
    />
  )
}
