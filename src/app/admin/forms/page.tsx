import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminFormsPage() {
  return (
    <AdminCrud
      entity="forms"
      title="Forms"
      subtitle="Structured information collected from candidates before they start."
      columns={[
        { name: 'title', label: 'Title' },
        { name: 'sensitivityClass', label: 'Access' },
        { name: '_count.packageForms', label: 'Packages' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'description',
          label: 'Instructions for the candidate',
          type: 'textarea',
          required: true,
          placeholder: 'Explain why FRAD needs this information and what the candidate should prepare.',
        },
        {
          name: 'sensitivityClass',
          label: 'Access classification',
          type: 'select',
          required: true,
          defaultValue: 'CONFIDENTIAL',
          options: [
            { value: 'STANDARD', label: 'Standard' },
            { value: 'CONFIDENTIAL', label: 'Confidential' },
            { value: 'RESTRICTED', label: 'Restricted HR only' },
          ],
        },
        { name: 'schemaJson', label: 'Fields', type: 'form-schema', required: true, defaultValue: '{"fields":[]}' },
        { name: 'active', label: 'Active', type: 'checkbox', defaultValue: false },
      ]}
    />
  )
}
