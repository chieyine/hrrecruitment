import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Home, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The requested FRAD careers page could not be found.',
  robots: { index: false, follow: false },
}

const usefulLinks = [
  {
    href: '/careers',
    title: 'Explore open roles',
    description: 'Browse current vacancies and find a role that matches your experience.',
    icon: BriefcaseBusiness,
  },
  {
    href: '/guidance',
    title: 'Read candidate guidance',
    description: 'Understand each step from application through preboarding.',
    icon: Search,
  },
]

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[#d9d4ca]" />
        <div aria-hidden="true" className="absolute -right-28 top-16 h-72 w-72 rounded-full border border-[#d8d0c3] sm:h-96 sm:w-96" />
        <div aria-hidden="true" className="absolute -right-12 top-32 h-44 w-44 rounded-full border border-[#d8d0c3] sm:h-64 sm:w-64" />

        <section className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="editorial-kicker">Error 404 · Page not found</p>
            <h1 className="editorial-title mt-6 text-5xl leading-[0.98] text-[#17211c] sm:text-7xl">
              We could not find that page.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#526158]">
              Check the address or use one of the links below. This does not affect your account or applications.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/careers" className="btn-primary inline-flex px-5 py-3">
                View open vacancies <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/" className="btn-secondary inline-flex px-5 py-3">
                <Home className="mr-2 h-4 w-4" /> Go to homepage
              </Link>
            </div>

            <Link href="/careers" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-800 underline-offset-4 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Return to the vacancy list
            </Link>
          </div>

          <aside className="self-end border-t-2 border-[#173426] bg-[#f8f6f1] p-6 shadow-[0_24px_70px_rgba(23,52,38,0.08)] sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c897f]">Useful destinations</p>
            <div className="mt-3 divide-y divide-[#d9d4ca]">
              {usefulLinks.map(({ href, title, description, icon: Icon }) => (
                <Link key={href} href={href} className="group grid grid-cols-[40px_1fr_auto] gap-3 py-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7ece7] text-[#173426]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[#17211c]">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#617067]">{description}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 text-[#9a4f2e] transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
            <p className="mt-5 border-l-2 border-[#d4875f] pl-4 text-xs leading-5 text-[#526158]">
              If a link inside your account repeatedly brings you here, use Messages to contact the recruitment team.
            </p>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}
