import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro, EmptyState } from '@/components/ui/PageElements'
import { CHECK_TYPE_LABELS, CHECK_STATUS_LABELS, isRestrictedCheck, type CheckType, type CheckStatus } from '@/lib/background-checks'
import BackgroundCheckActions from '@/components/recruitment/BackgroundCheckActions'

/**
 * §16 Due-diligence register.
 *
 * Restricted findings are removed on the server for anyone without
 * `backgroundcheck.read.restricted`. The row still appears — the process has to
 * be manageable — but the finding text does not reach the browser.
 */
export default async function BackgroundChecksPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [canManage, canReadRestricted] = await Promise.all([
    hasPermission(user.userId, 'backgroundcheck.manage'),
    hasPermission(user.userId, 'backgroundcheck.read.restricted'),
  ])
  if (!canManage) redirect('/recruitment/dashboard')

  const [checks, candidates] = await Promise.all([prisma.backgroundCheck.findMany({
    where: { status: { notIn: ['NOT_APPLICABLE'] } },
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      checkType: true,
      status: true,
      outcome: true,
      providerName: true,
      findingSummary: true,
      requestedAt: true,
      receivedAt: true,
      expiresAt: true,
      waivedReason: true,
      application: {
        select: {
          id: true,
          referenceNumber: true,
          internalStatus: true,
          candidate: { select: { legalFirstName: true, lastName: true } },
          vacancy: { select: { referenceNumber: true, title: true } },
        },
      },
    },
  }), prisma.application.findMany({
    where: { internalStatus: { in: ['REFERENCE_CHECK', 'BACKGROUND_CHECK', 'RECOMMENDED'] } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      candidate: { select: { legalFirstName: true, lastName: true } },
      vacancy: { select: { referenceNumber: true } },
    },
  })])

  const outstanding = checks.filter((check) => !['CLEARED', 'WAIVED'].includes(check.status))
  const concerns = checks.filter((check) => check.status === 'CONCERNS_RAISED' || check.status === 'FAILED')

  const tone = (status: string) =>
    status === 'CLEARED'
      ? 'bg-emerald-100 text-emerald-900'
      : status === 'CONCERNS_RAISED' || status === 'FAILED'
        ? 'bg-rose-100 text-rose-900'
        : status === 'WAIVED'
          ? 'bg-stone-200 text-stone-700'
          : 'bg-amber-100 text-amber-900'

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Assess and decide"
            title="Background checks"
            description="Identity, qualification, employment, licence, safeguarding and sanctions checks. Findings are restricted and never shown to interview panels."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Outstanding</p>
              <p className="mt-1 text-2xl font-bold">{outstanding.length}</p>
            </div>
            <div className="border border-rose-300 bg-rose-50 px-5 py-4 text-rose-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Concerns or failures</p>
              <p className="mt-1 text-2xl font-bold">{concerns.length}</p>
            </div>
            <div className="border border-stone-300 bg-white px-5 py-4 text-stone-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Total on record</p>
              <p className="mt-1 text-2xl font-bold">{checks.length}</p>
            </div>
          </div>

          <BackgroundCheckActions
            checks={checks.map((check) => ({
              id: check.id,
              applicationId: check.application.id,
              checkType: check.checkType,
              status: check.status,
              restricted: isRestrictedCheck(check.checkType),
            }))}
            candidates={candidates.map((application) => ({
              id: application.id,
              label: `${application.candidate.legalFirstName} ${application.candidate.lastName} · ${application.vacancy.referenceNumber}`,
            }))}
            canWaive={user.roles.includes('HR_MANAGER')}
          />

          {!canReadRestricted && (
            <p className="border-l-4 border-stone-400 bg-stone-100 px-4 py-3 text-sm text-stone-700">
              You can see the status of safeguarding, criminal-record and sanctions checks, but not their findings.
            </p>
          )}

          {checks.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No checks recorded yet"
              description="Checks are created from a candidate's record once they reach the due-diligence stage. The required set depends on the vacancy's safeguarding classification."
            />
          ) : (
            <div className="overflow-x-auto border border-stone-300 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Check</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Finding</th>
                    <th className="px-4 py-3">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {checks.map((check) => {
                    const redacted = isRestrictedCheck(check.checkType) && !canReadRestricted
                    return (
                      <tr key={check.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/recruitment/applications/${check.application.id}`}
                            className="font-semibold text-brand-800 underline underline-offset-4"
                          >
                            {check.application.candidate.legalFirstName} {check.application.candidate.lastName}
                          </Link>
                          <span className="block text-xs text-stone-600">
                            {check.application.vacancy.referenceNumber} · {check.application.vacancy.title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-800">
                          {CHECK_TYPE_LABELS[check.checkType as CheckType] || check.checkType}
                          {isRestrictedCheck(check.checkType) && (
                            <span className="ml-2 bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                              Restricted
                            </span>
                          )}
                          {check.providerName && (
                            <span className="block text-xs text-stone-600">{check.providerName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${tone(check.status)}`}>
                            {CHECK_STATUS_LABELS[check.status as CheckStatus] || check.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          {redacted ? (
                            <span className="text-stone-400">Restricted</span>
                          ) : (
                            check.findingSummary || check.waivedReason || check.outcome || '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-600">
                          {check.requestedAt ? new Date(check.requestedAt).toLocaleDateString('en-GB') : 'Not requested'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
