import { notFound, redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import EditVacancyForm from '@/components/recruitment/EditVacancyForm'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getVerifiedUser()
  if (!user) redirect(`/auth/login?next=/recruitment/vacancies/${id}/edit`)
  if (!(await hasPermission(user.userId, 'vacancy.update.all'))) redirect(`/recruitment/vacancies/${id}`)
  const vacancy = await prisma.vacancy.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!vacancy) notFound()
  if (vacancy.status !== 'DRAFT') redirect(`/recruitment/vacancies/${id}`)

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <EditVacancyForm vacancyId={id} />
      <Footer />
    </div>
  )
}
