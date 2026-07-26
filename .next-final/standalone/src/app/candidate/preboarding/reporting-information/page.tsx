import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { ArrowLeft, MapPin } from 'lucide-react'
import { SimpleAction } from '@/components/shared/PreboardingActions'

export const dynamic = 'force-dynamic'

export default async function CandidateReportingInfoPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const items = pb?.infoItems ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/candidate/preboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Preboarding
          </Link>
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Things to Know Before Resumption</h1>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">Reporting information will appear here once HR publishes it for you.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{it.category}</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{it.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{it.content}</p>
                  {it.acknowledgementRequired && !it.acknowledgedAt && <SimpleAction resourceId={it.id} action="INFO_ACKNOWLEDGE" label="Acknowledge" />}
                  {it.acknowledgedAt && <p className="mt-2 text-xs font-bold text-emerald-700">Acknowledged</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
