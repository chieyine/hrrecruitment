import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminDutyStationsPage() {
  return (
    <AdminCrud
      entity="duty-stations"
      title="Duty Stations"
      subtitle="Physical work locations candidates may be deployed to."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'state', label: 'State' },
        { name: 'lga', label: 'LGA' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'state', label: 'State', required: true },
        { name: 'lga', label: 'LGA' },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
