import AdminCrud from '@/components/admin/AdminCrud'

export default function DocumentRequirementsPage() {
  return (
    <AdminCrud
      entity="document-requirements"
      title="Preboarding document requirements"
      subtitle="Define the evidence a new starter must provide, its file controls, review requirement and sensitivity."
      columns={[
        { name: 'name', label: 'Requirement' },
        { name: 'documentType', label: 'Document type' },
        { name: 'required', label: 'Required' },
        { name: 'reviewRequired', label: 'HR review' },
        { name: 'sensitivityClass', label: 'Sensitivity' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Requirement name', required: true },
        { name: 'description', label: 'Candidate guidance', type: 'textarea' },
        { name: 'documentType', label: 'Document type code', required: true },
        { name: 'allowedFileTypes', label: 'Allowed file extensions', required: true, placeholder: 'pdf,jpg,png' },
        { name: 'maximumFileSize', label: 'Maximum file size (bytes)', type: 'number', required: true },
        {
          name: 'sensitivityClass',
          label: 'Sensitivity',
          type: 'select',
          options: [
            { value: 'STANDARD', label: 'Standard' },
            { value: 'CONFIDENTIAL', label: 'Confidential' },
            { value: 'RESTRICTED', label: 'Restricted' },
          ],
        },
        { name: 'required', label: 'Required', type: 'checkbox' },
        { name: 'expiryRequired', label: 'Expiry date required', type: 'checkbox' },
        { name: 'reviewRequired', label: 'HR review required', type: 'checkbox' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
