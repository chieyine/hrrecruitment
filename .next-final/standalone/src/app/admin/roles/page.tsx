import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminRolesPage() {
  return (
    <AdminCrud
      entity="roles"
      title="Roles"
      subtitle="System roles that grant permissions to users."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'description', label: 'Description' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  )
}
