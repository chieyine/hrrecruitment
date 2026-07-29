import AdminCrud from '@/components/admin/AdminCrud'
export default function Page() {
  return (
    <AdminCrud
      entity="document-types"
      title="Document types"
      subtitle="The file categories candidates can save to their profile or attach to an application."
      columns={[
        { name: 'name', label: 'Name' },
        { name: 'code', label: 'Code' },
        { name: 'allowedFileTypes', label: 'File types' },
        { name: 'usage.total', label: 'In use' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Candidate-facing name', required: true },
        { name: 'code', label: 'Stable code', required: true, placeholder: 'For example, CV' },
        {
          name: 'allowedFileTypes',
          label: 'Accepted file types',
          required: true,
          placeholder: 'pdf,doc,docx',
          helpText: 'Comma-separated extensions. Supported: PDF, JPG, JPEG, PNG, DOC and DOCX.',
        },
        {
          name: 'maximumFileSize',
          label: 'Maximum file size',
          type: 'number',
          required: true,
          defaultValue: 5,
          scale: 1048576,
          suffix: 'MB',
          min: 1,
          max: 10,
          step: 1,
        },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
