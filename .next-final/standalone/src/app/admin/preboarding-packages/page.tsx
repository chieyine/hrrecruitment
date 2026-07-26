import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminPreboardingPackagesPage() {
  return (
    <><AdminCrud
      entity="preboarding-packages"
      title="Preboarding Packages"
      subtitle="Bundles of forms, documents, policies, courses and tasks by candidate type."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'candidateType', label: 'Candidate Type' },
        { name: 'roleCategory', label: 'Role Category' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'candidateType', label: 'Candidate Type', type: 'select', options: [
          { value: 'GENERAL', label: 'General' },
          { value: 'HEALTH', label: 'Health' },
          { value: 'FIELD', label: 'Field' },
          { value: 'FINANCE', label: 'Finance' },
          { value: 'DRIVER', label: 'Driver' },
        ] },
        { name: 'roleCategory', label: 'Role Category' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    /><ConfigurationBuilder mode="packages"/></>
  )
}
