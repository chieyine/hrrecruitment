import { redirect } from 'next/navigation'
import AdminCrud from '@/components/admin/AdminCrud'
import { getVerifiedUser } from '@/lib/auth'

export default async function AdminTasksPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('HR_MANAGER')) {
    redirect(user.roles.includes('SYSTEM_ADMIN') ? '/admin/system-settings' : '/recruitment/dashboard')
  }

  return (
    <AdminCrud
      entity="tasks"
      title="Additional requests"
      subtitle="Actions for an accepted candidate that do not belong in a form, document check, policy or course."
      columns={[
        { name: 'title', label: 'Request' },
        { name: 'reviewRequired', label: 'HR review' },
        { name: 'evidenceRequired', label: 'Evidence' },
        { name: '_count.packageTasks', label: 'Packages' },
        { name: '_count.candidateTasks', label: 'Assigned' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Active' },
      ]}
      fields={[
        {
          name: 'title',
          label: 'Candidate-facing title',
          required: true,
          placeholder: 'For example, Confirm travel arrangements',
        },
        {
          name: 'description',
          label: 'What the candidate needs to do',
          type: 'textarea',
          required: true,
          placeholder: 'Give the instruction, what completion means and who to contact if they need help.',
        },
        {
          name: 'reviewRequired',
          label: 'HR must review completion',
          type: 'checkbox',
          defaultValue: false,
          helpText: 'Use this when a staff member must accept or return the candidate’s submission.',
        },
        {
          name: 'evidenceRequired',
          label: 'Candidate must attach evidence',
          type: 'checkbox',
          defaultValue: false,
          helpText: 'Use a document requirement instead when the file itself is the main requirement.',
        },
        {
          name: 'active',
          label: 'Available to preboarding packages',
          type: 'checkbox',
          defaultValue: false,
          helpText: 'New requests start as drafts and must be released before they can be assigned.',
        },
      ]}
    />
  )
}
