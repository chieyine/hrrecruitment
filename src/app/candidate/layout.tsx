import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'
import { homeRouteForRoles } from '@/lib/home-route'

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))
  return children
}
