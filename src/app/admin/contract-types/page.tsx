import AdminCrud from '@/components/admin/AdminCrud'
export default function Page() {
  return (
    <AdminCrud
      entity="contract-types"
      title="Contract types"
      subtitle="Options available when a vacancy is created."
      columns={[
        { name: 'code', label: 'Code' },
        { name: 'name', label: 'Name' },
        { name: 'description', label: 'Description' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
