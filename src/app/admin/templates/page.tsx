import { redirect } from 'next/navigation'
import AdminCrud from '@/components/admin/AdminCrud'
import { getVerifiedUser } from '@/lib/auth'

export default async function OfferTemplatesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('HR_MANAGER')) {
    redirect(user.roles.includes('SYSTEM_ADMIN') ? '/admin/system-settings' : '/recruitment/dashboard')
  }

  return (
    <AdminCrud
      entity="templates"
      title="Offer letters"
      subtitle="Approved wording placed inside FRAD’s formal candidate PDF."
      columns={[
        { name: 'name', label: 'Template' },
        { name: 'candidateType', label: 'For' },
        { name: '_count.offers', label: 'Offers' },
        { name: 'version', label: 'Version' },
        { name: 'active', label: 'Available' },
      ]}
      fields={[
        {
          name: 'name',
          label: 'Template name',
          required: true,
          placeholder: 'For example, Standard employee offer',
        },
        {
          name: 'candidateType',
          label: 'Engagement',
          type: 'select',
          required: true,
          options: [
            { value: 'GENERAL', label: 'Employee' },
            { value: 'CONSULTANT', label: 'Consultant' },
            { value: 'INTERN', label: 'Intern' },
          ],
        },
        { name: 'bodyTemplate', label: 'Approved letter wording', type: 'offer-body', required: true },
        {
          name: 'active',
          label: 'Available when preparing an offer',
          type: 'checkbox',
          defaultValue: false,
          helpText: 'New wording starts as a draft and must be independently reviewed before use.',
        },
      ]}
    />
  )
}
