import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminNotificationTemplatesPage() {
  return (
    <AdminCrud
      entity="notification-templates"
      title="Notification Templates"
      subtitle="Versioned email and in-app notification copy with supported variables."
      columns={[
        { name: 'code', label: 'Code' },
        { name: 'subject', label: 'Subject' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'code', label: 'Unique Code', required: true, placeholder: 'APPLICATION_RECEIVED' },
        { name: 'subject', label: 'Email Subject', required: true },
        {
          name: 'bodyTemplate',
          label: 'Body Template',
          type: 'textarea',
          required: true,
          placeholder: 'Dear {{candidate_name}}, ...',
        },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
