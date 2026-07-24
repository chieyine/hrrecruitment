import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

function readable(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}

export default async function AuditLogPage() {
  const user = await getVerifiedUser()

  if (!user || user.roles.length === 0 || user.roles.every((role) => role === 'CANDIDATE')) {
    redirect('/auth/login')
  }
  if (!await hasPermission(user.userId, 'audit.read')) redirect('/recruitment/dashboard')

  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: true,
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="page-shell space-y-6">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to recruitment
          </Link>

          <PageIntro
            eyebrow="Accountability"
            title="Audit trail"
            description="A chronological record of sensitive decisions and changes. Entries are retained for review and cannot be edited here."
          />

          <div className="section-panel">
            <div className="section-heading">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Recent activity</h2>
                <p className="mt-1 text-sm text-slate-600">Showing the latest 50 recorded events, newest first.</p>
              </div>
              <span className="status-chip bg-slate-100 text-slate-700">{logs.length} entries</span>
            </div>
            {logs.length === 0 ? (
              <EmptyState title="No activity recorded" description="Sensitive actions will appear here when they occur." />
            ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Date and time</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Record</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap py-3.5 px-4 text-slate-600">{formatDateTime(log.createdAt)}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {log.actor?.email || 'System'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="status-chip bg-blue-50 text-blue-800">
                            {readable(log.action)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="block font-medium text-slate-800">{readable(log.resourceType)}</span>
                          <span className="font-mono text-xs text-slate-500">{log.resourceId}</span>
                        </td>
                        <td className="max-w-sm py-3.5 px-4 text-slate-600">{log.reason || 'No reason recorded'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
