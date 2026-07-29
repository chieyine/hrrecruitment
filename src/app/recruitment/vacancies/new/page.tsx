import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import NewVacancyForm from '@/components/recruitment/NewVacancyForm'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

export default async function NewVacancyPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?next=/recruitment/vacancies/new')
  if (!(await hasPermission(user.userId, 'vacancy.create.all'))) redirect('/recruitment/vacancies')

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <NewVacancyForm />
      <Footer />
    </div>
  )
}
