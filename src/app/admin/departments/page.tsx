import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminDepartmentsPage() {
  return (
    <AdminCrud
      entity="departments"
      title="Departments"
      subtitle="Organisational units used on vacancies and in recruitment reporting."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        { name: '_count.vacancies', label: 'Vacancies' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Department name', required: true },
        { name: 'code', label: 'Reporting code', required: true, placeholder: 'For example, FINANCE' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
