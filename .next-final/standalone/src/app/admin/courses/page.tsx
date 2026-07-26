import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminCoursesPage() {
  return (
    <><AdminCrud
      entity="courses"
      title="Compulsory Courses"
      subtitle="Preboarding courses, durations, and quiz pass benchmarks."
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
        { name: 'category', label: 'Category', type: 'select', options: [
          { value: 'CORE', label: 'Core' },
          { value: 'HEALTH', label: 'Health' },
          { value: 'FINANCE', label: 'Finance' },
          { value: 'DRIVER', label: 'Driver' },
          { value: 'MEAL', label: 'MEAL' },
          { value: 'MANAGER', label: 'Manager' },
        ] },
        { name: 'learningObjectives', label: 'Learning Objectives', type: 'textarea' },
        { name: 'estimatedDurationMinutes', label: 'Duration (minutes)', type: 'number' },
        { name: 'passMark', label: 'Pass Mark (%)', type: 'number' },
        { name: 'allowedAttempts', label: 'Allowed Attempts', type: 'number' },
        { name: 'certificateEnabled', label: 'Certificate Enabled', type: 'checkbox' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    /><ConfigurationBuilder mode="courses"/></>
  )
}
