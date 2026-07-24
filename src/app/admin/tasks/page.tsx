import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminTasksPage() {
  return (
    <AdminCrud
      entity="tasks"
      title="Pre-resumption Tasks"
      subtitle="Task templates assigned to candidates before resumption."
      columns={[
        { name: 'title', label: 'Title' },
        { name: 'category', label: 'Category' },
        { name: 'required', label: 'Required' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'category', label: 'Category' },
        { name: 'required', label: 'Required', type: 'checkbox' },
        { name: 'reviewRequired', label: 'Review Required', type: 'checkbox' },
        { name: 'evidenceRequired', label: 'Evidence Required', type: 'checkbox' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
