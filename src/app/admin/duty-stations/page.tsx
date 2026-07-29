import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminDutyStationsPage() {
  return (
    <AdminCrud
      entity="duty-stations"
      title="Locations"
      subtitle="Work locations available when a vacancy is created."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'state', label: 'State' },
        { name: 'lga', label: 'Local government area' },
        { name: '_count.vacancies', label: 'Vacancies' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Location name', required: true, placeholder: 'For example, Maiduguri office' },
        { name: 'state', label: 'State', required: true },
        { name: 'lga', label: 'Local government area' },
        {
          name: 'address',
          label: 'Candidate-facing address',
          type: 'textarea',
          helpText: 'Shown in appointment and preboarding information when a physical address is needed.',
        },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
