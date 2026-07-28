import AdminCrud from '@/components/admin/AdminCrud'

export default function VacancyCategoriesPage() {
  return (
    <AdminCrud
      entity="vacancy-categories"
      title="Vacancy Categories"
      subtitle="Job families used to classify vacancies."
      columns={[
        { name: 'code', label: 'Code' },
        { name: 'name', label: 'Name' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
