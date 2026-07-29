import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminProjectsPage() {
  return (
    <AdminCrud
      entity="projects"
      title="Projects"
      subtitle="Funded programmes or grants used to attribute vacancies and report recruitment activity."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        { name: '_count.vacancies', label: 'Vacancies' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Project name', required: true },
        { name: 'code', label: 'Reporting code', required: true, placeholder: 'For example, BHA_NE_2026' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
