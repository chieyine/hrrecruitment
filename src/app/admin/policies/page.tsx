import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminPoliciesPage() {
  return (
    <AdminCrud
      entity="policies"
      title="Policies & Documents"
      subtitle="Policies candidates must read and acknowledge during preboarding."
      columns={[
        { name: 'title', label: 'Title' },
        { name: 'category', label: 'Category' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'category', label: 'Category', type: 'select', options: [
          { value: 'CODE_OF_CONDUCT', label: 'Code of Conduct' },
          { value: 'SAFEGUARDING', label: 'Safeguarding' },
          { value: 'PSEA', label: 'PSEA' },
          { value: 'CONFIDENTIALITY', label: 'Confidentiality' },
          { value: 'DATA_PROTECTION', label: 'Data Protection' },
          { value: 'ICT', label: 'ICT' },
        ] },
        { name: 'version', label: 'Version', type: 'number' },
        { name: 'effectiveDate', label: 'Effective Date', type: 'date' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
        { name: 'acknowledgementMethod', label: 'Acknowledgement Method', type: 'select', options: [
          { value: 'ACKNOWLEDGE', label: 'Acknowledge' },
          { value: 'TYPED_NAME', label: 'Typed Name' },
          { value: 'DRAWN_SIGNATURE', label: 'Drawn Signature' },
          { value: 'UPLOAD_SIGNED', label: 'Upload Signed' },
        ] },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
