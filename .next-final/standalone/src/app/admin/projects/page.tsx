import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminProjectsPage() {
  return (
    <AdminCrud
      entity="projects"
      title="Projects"
      subtitle="Funded projects that vacancies can be attributed to."
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
