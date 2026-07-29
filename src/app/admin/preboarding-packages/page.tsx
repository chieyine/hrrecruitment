import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminPreboardingPackagesPage() {
  return (
    <>
      <AdminCrud
        entity="preboarding-packages"
        title="Preboarding packages"
        subtitle="The forms, evidence, policies, learning and tasks assigned after an offer is accepted."
        columns={[
          { name: 'name', label: 'Name' },
          { name: 'version', label: 'Version' },
          { name: 'usage.vacancies', label: 'Vacancies' },
          { name: 'active', label: 'Active' },
        ]}
        fields={[
          { name: 'name', label: 'Package name', required: true, placeholder: 'For example, Field programme staff' },
          {
            name: 'description',
            label: 'When to use this package',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the roles or working conditions this package covers.',
          },
          { name: 'active', label: 'Active', type: 'checkbox', defaultValue: false },
        ]}
      />
      <ConfigurationBuilder mode="packages" />
    </>
  )
}
