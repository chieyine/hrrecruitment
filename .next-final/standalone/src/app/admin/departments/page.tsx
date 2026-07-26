import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminDepartmentsPage() {
  return (
    <AdminCrud
      entity="departments"
      title="Departments"
      subtitle="Organisational departments used to categorise vacancies."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
