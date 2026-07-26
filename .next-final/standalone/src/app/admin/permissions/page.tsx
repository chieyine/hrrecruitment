import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminPermissionsPage() {
  return (
    <AdminCrud
      entity="permissions"
      title="Permissions"
      subtitle="Granular permission codes referenced by role assignments."
      columns={[
        { name: 'code', label: 'Code' },
        { name: 'description', label: 'Description' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true, placeholder: 'vacancy.create.all' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  )
}
