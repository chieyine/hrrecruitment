import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminCoursesPage() {
  return (
    <>
      <AdminCrud
        entity="courses"
        title="Courses"
        subtitle="Learning assigned through a preboarding package."
        columns={[
          { name: 'title', label: 'Title' },
          { name: 'category', label: 'Category' },
          { name: 'estimatedDurationMinutes', label: 'Minutes' },
          { name: 'passMark', label: 'Pass %' },
          { name: 'active', label: 'Active' },
        ]}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            options: [
              { value: 'CORE', label: 'Core' },
              { value: 'HEALTH', label: 'Health' },
              { value: 'FINANCE', label: 'Finance' },
              { value: 'DRIVER', label: 'Driver' },
              { value: 'MEAL', label: 'MEAL' },
              { value: 'MANAGER', label: 'Manager' },
            ],
          },
          { name: 'learningObjectives', label: 'Learning objectives', type: 'textarea' },
          { name: 'estimatedDurationMinutes', label: 'Duration (minutes)', type: 'number' },
          { name: 'passMark', label: 'Pass mark (%)', type: 'number' },
          { name: 'allowedAttempts', label: 'Allowed attempts', type: 'number' },
          { name: 'certificateEnabled', label: 'Issue certificate', type: 'checkbox' },
          { name: 'active', label: 'Active', type: 'checkbox', defaultValue: false },
        ]}
      />
      <ConfigurationBuilder mode="courses" />
    </>
  )
}
