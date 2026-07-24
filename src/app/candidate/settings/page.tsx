import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import AccountSettingsActions from '@/components/shared/AccountSettingsActions'
import { prisma } from '@/lib/prisma'
import { PageIntro } from '@/components/ui/PageElements'

export default async function CandidateSettingsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const talentPoolConsent = await prisma.consentRecord.findFirst({
    where: { candidate: { userId: user.userId }, consentType: 'TALENT_POOL', decision: true, withdrawnAt: null },
    select: { id: true },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="page-shell max-w-4xl space-y-6">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to your account
          </Link>

          <PageIntro
            eyebrow="Your account"
            title="Account, notifications and privacy"
            description="Keep your contact details current, choose whether we may contact you about future roles, or exercise your privacy rights."
          />

          <section className="section-panel" aria-labelledby="delivery-heading">
            <div className="section-heading">
              <div>
                <h2 id="delivery-heading" className="text-lg font-bold text-slate-950">Recruitment updates</h2>
                <p className="mt-1 text-sm text-slate-600">Updates about an application are always sent to your account and registered email.</p>
              </div>
              <span className="status-chip bg-emerald-50 text-emerald-800">Always on</span>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-900">Registered email</dt>
                <dd className="mt-1 break-all text-slate-600">{user.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">What we send</dt>
                <dd className="mt-1 text-slate-600">Receipts, interview and assessment details, decisions, offers and security alerts.</dd>
              </div>
            </dl>
          </section>

          <AccountSettingsActions talentPoolConsent={Boolean(talentPoolConsent)} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
