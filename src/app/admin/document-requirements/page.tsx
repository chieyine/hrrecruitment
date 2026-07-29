import AdminCrud from '@/components/admin/AdminCrud'
import { prisma } from '@/lib/prisma'

export default async function DocumentRequirementsPage() {
  const documentTypes = await prisma.documentType.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { code: true, name: true },
  })

  return (
    <AdminCrud
      entity="document-requirements"
      title="Document requirements"
      subtitle="Define reusable evidence checks for preboarding packages. The package decides whether each check is mandatory."
      columns={[
        { name: 'name', label: 'Requirement' },
        { name: 'documentType', label: 'Document type' },
        { name: 'sensitivityClass', label: 'Sensitivity' },
        { name: '_count.packageDocuments', label: 'Packages' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'name', label: 'Requirement name', required: true },
        {
          name: 'description',
          label: 'Instructions for the candidate',
          type: 'textarea',
          required: true,
          placeholder: 'State exactly what FRAD needs and what makes the document acceptable.',
        },
        {
          name: 'documentType',
          label: 'Document type',
          type: 'select',
          required: true,
          options: documentTypes.map((type) => ({ value: type.code, label: `${type.name} (${type.code})` })),
        },
        {
          name: 'allowedFileTypes',
          label: 'Accepted file types',
          required: true,
          placeholder: 'pdf,jpg,png',
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
        {
          name: 'sensitivityClass',
          label: 'Access classification',
          type: 'select',
          required: true,
          defaultValue: 'CONFIDENTIAL',
          options: [
            { value: 'STANDARD', label: 'Standard' },
            { value: 'CONFIDENTIAL', label: 'Confidential' },
            { value: 'RESTRICTED', label: 'Restricted' },
          ],
        },
        { name: 'expiryRequired', label: 'Expiry date required', type: 'checkbox' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
