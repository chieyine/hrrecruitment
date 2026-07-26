import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { Plus, ArrowLeft } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export default async function RecruitmentVacanciesPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  const readAll = await hasPermission(user.userId, 'vacancy.read.all')
  const readAssigned = await hasPermission(user.userId, 'vacancy.read.assigned')
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')
  const canCreate = await hasPermission(user.userId, 'vacancy.create.all')

  const vacancies = await prisma.vacancy.findMany({
    where: readAll ? {} : { ownerUserId: user.userId },
    include: {
      department: true,
      dutyStation: true,
      applications: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          <div className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Vacancies</h1>
              <p className="mt-2 text-sm text-slate-600">Create vacancies and review publication status.</p>
            </div>

            {canCreate && <Link
                href="/recruitment/vacancies/new"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500 transition-all"
              >
                <Plus className="h-4 w-4" /> Create vacancy
              </Link>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Duty Station</th>
                    <th className="py-3 px-4">Applicants</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Closing Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {vacancies.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{v.referenceNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{v.title}</td>
                      <td className="py-3.5 px-4">{v.department.name}</td>
                      <td className="py-3.5 px-4">{v.dutyStation.name}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{v.applications.length}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">{formatDate(v.closingAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
