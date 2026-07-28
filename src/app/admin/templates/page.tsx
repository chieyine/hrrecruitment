import AdminCrud from '@/components/admin/AdminCrud'
export default function Page() {
  return (
    <AdminCrud
      entity="templates"
      title="Offer Templates"
      subtitle="Versioned offer letter bodies."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'candidateType', label: 'Candidate type' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'candidateType', label: 'Candidate type', required: true },
        { name: 'bodyTemplate', label: 'Template body', type: 'textarea', required: true },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
