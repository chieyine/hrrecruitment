import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'

const stages = [
  {
    number: '01',
    title: 'Apply',
    body: 'Choose an open role, review its requirements and submit a role-specific application before the closing date.',
  },
  {
    number: '02',
    title: 'Review',
    body: 'The recruitment team checks applications against the published criteria. Your account will show the status FRAD can share.',
  },
  {
    number: '03',
    title: 'Assessment and interview',
    body: 'Shortlisted candidates may be asked to complete an assessment or attend a panel interview. Instructions and deadlines appear in your account.',
  },
  {
    number: '04',
    title: 'References and offer',
    body: 'FRAD may contact your nominated referees. Any offer and its response deadline will be available securely in the portal.',
  },
  {
    number: '05',
    title: 'Prepare to start',
    body: 'Successful candidates complete the required documents, policies and orientation actions before their agreed start date.',
  },
]

export default async function GuidancePage() {
  const user = await getVerifiedUser()

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1">
        <header className="border-b border-[#d9d4ca]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <span className="editorial-kicker">How we hire</span>
            <h1 className="editorial-title mt-5 max-w-3xl text-5xl text-[#17211c] sm:text-6xl">A clear process, from application to start date.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#526158]">
              The exact steps vary by role. FRAD will tell you what is required and when you need to respond.
            </p>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8 lg:py-16">
          <div className="divide-y divide-[#d9d4ca] border-y border-[#d9d4ca]">
            {stages.map((stage) => (
              <article key={stage.number} className="grid gap-3 bg-[#f8f6f1] px-5 py-8 sm:grid-cols-[60px_1fr] sm:px-8">
                <span className="font-display text-2xl text-[#9a4f2e]">{stage.number}</span>
                <div>
                  <h2 className="font-display text-3xl text-[#17211c]">{stage.title}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5b6860]">{stage.body}</p>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-8">
            <div className="border-t-2 border-brand-800 pt-5">
              <h2 className="font-display text-xl">What FRAD expects</h2>
              <p className="mt-3 text-sm leading-6 text-[#617067]">
                Accurate information, evidence relevant to the role and responses submitted by the stated deadline.
              </p>
            </div>
            <div className="border-t border-[#cfc9bd] pt-5">
              <h2 className="text-sm font-bold">Reasonable adjustments</h2>
              <p className="mt-2 text-xs leading-5 text-[#617067]">
                Tell the recruitment team if you need an adjustment to take part in an assessment or interview.
              </p>
              <Link href={user ? '/candidate/accommodations' : '/auth/login'} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-800">
                Request an adjustment <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="bg-brand-900 p-6 text-white">
              <p className="text-sm font-bold">There are no recruitment fees.</p>
              <p className="mt-2 text-xs leading-5 text-brand-100">If anyone asks you to pay for a FRAD role, do not pay them.</p>
              <Link href="/report-fraud" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white underline underline-offset-4">
                Report recruitment fraud
              </Link>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  )
}
