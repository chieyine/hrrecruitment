import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminFormsPage() {
  return (
    <AdminCrud
      entity="forms"
      title="Pre-employment Forms"
      subtitle="Form templates candidates complete during preboarding."
      columns={[
        { name: 'title', label: 'Title' },
        { name: 'required', label: 'Required' },
        { name: 'reviewRequired', label: 'Review' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'schemaJson', label: 'Schema (JSON)', type: 'textarea', placeholder: '{"fields":[]}' },
        { name: 'required', label: 'Required', type: 'checkbox' },
        { name: 'reviewRequired', label: 'Review Required', type: 'checkbox' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
