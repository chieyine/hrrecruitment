import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminPoliciesPage() {
  return (
    <AdminCrud
      entity="policies"
      title="Policies"
      subtitle="Official documents candidates read and acknowledge before they start."
      columns={[
        { name: 'title', label: 'Title' },
        { name: 'category', label: 'Category' },
        { name: '_count.packagePolicies', label: 'Packages' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: [
            { value: 'CODE_OF_CONDUCT', label: 'Code of conduct' },
            { value: 'SAFEGUARDING', label: 'Safeguarding' },
            { value: 'PSEA', label: 'Prevention of sexual exploitation and abuse' },
            { value: 'CONFIDENTIALITY', label: 'Confidentiality' },
            { value: 'DATA_PROTECTION', label: 'Data protection' },
            { value: 'ICT', label: 'Information technology' },
          ],
          required: true,
        },
        { name: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
        {
          name: 'summary',
          label: 'What the candidate should know',
          type: 'textarea',
          required: true,
          placeholder: 'Briefly explain what this policy covers and why the candidate must read it.',
        },
        { name: 'fileAssetId', label: 'Official policy PDF', type: 'policy-file', required: true },
        {
          name: 'acknowledgementMethod',
          label: 'How the candidate acknowledges it',
          type: 'select',
          required: true,
          defaultValue: 'TYPED_NAME',
          options: [
            { value: 'ACKNOWLEDGE', label: 'Confirmation checkbox' },
            { value: 'TYPED_NAME', label: 'Typed legal name' },
            { value: 'DRAWN_SIGNATURE', label: 'Drawn signature' },
            { value: 'UPLOAD_SIGNED', label: 'Upload a signed PDF' },
          ],
        },
        { name: 'active', label: 'Active', type: 'checkbox', defaultValue: false },
      ]}
    />
  )
}
