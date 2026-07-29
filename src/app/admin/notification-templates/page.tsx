import AdminCrud from '@/components/admin/AdminCrud'

export default function AdminNotificationTemplatesPage() {
  return (
    <AdminCrud
      entity="notification-templates"
      title="Message templates"
      subtitle="Approved starting points for application-linked messages to candidates."
      columns={[
        { name: 'subject', label: 'Subject' },
        { name: 'code', label: 'Code' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        { name: 'code', label: 'Stable code', required: true, placeholder: 'APPLICATION_RECEIVED' },
        { name: 'subject', label: 'Subject', required: true, placeholder: 'We received your application for {{vacancy_title}}' },
        {
          name: 'bodyTemplate',
          label: 'Message',
          type: 'message-body',
          required: true,
        },
        { name: 'active', label: 'Active', type: 'checkbox', defaultValue: false },
      ]}
    />
  )
}
