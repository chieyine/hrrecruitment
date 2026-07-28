import AdminCrud from '@/components/admin/AdminCrud'
export default function Page() {
  return (
    <AdminCrud
      entity="document-types"
      title="Document Types"
      subtitle="Reusable upload categories and controls."
      columns={[
        { name: 'code', label: 'Code' },
        { name: 'name', label: 'Name' },
        { name: 'allowedFileTypes', label: 'File types' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'allowedFileTypes', label: 'Allowed extensions', required: true },
        { name: 'maximumFileSize', label: 'Max bytes', type: 'number' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
