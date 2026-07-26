import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, CalendarDays, MapPin, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Open Vacancies',
  description: 'View current FRAD vacancies and apply through the official candidate portal.',
}

export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: { search?: string; departmentId?: string; dutyStationId?: string }
}) {
  const user = await getVerifiedUser()
  const [departments, dutyStations] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.dutyStation.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ])

  const where: any = {
    status: 'OPEN',
    openingAt: { lte: new Date() },
    closingAt: { gt: new Date() },
  }

  if (searchParams.departmentId) where.departmentId = searchParams.departmentId
  if (searchParams.dutyStationId) where.dutyStationId = searchParams.dutyStationId
  // Cap the untrusted search term: it comes straight from a public query
  // string and otherwise drives an unbounded LIKE scan.
  const search = searchParams.search?.trim().slice(0, 100)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
    ]
  }

  const vacancies = await prisma.vacancy.findMany({
    where,
    include: { department: true, dutyStation: true, project: true },
    orderBy: { closingAt: 'asc' },
    // Bounded so a large campaign cannot render an unbounded page.
    take: 200,
  })

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1">
        <section className="border-b border-surface-200 bg-surface-50">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_360px]">
            <div className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
              <span className="editorial-kicker">FRAD vacancies</span>
              <h1 className="editorial-title mt-5 max-w-3xl text-5xl text-navy-900 sm:text-6xl lg:text-7xl">
                Current opportunities
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                Search current vacancies, read the requirements and apply before the published closing date.
              </p>
            </div>

            <div className="flex flex-col justify-between bg-brand-900 px-7 py-9 text-white sm:px-9 lg:py-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">Now recruiting</p>
                <p className="mt-4 font-display text-6xl">{vacancies.length}</p>
                <p className="mt-1 text-sm text-brand-100">{vacancies.length === 1 ? 'open position' : 'open positions'}</p>
              </div>
              <div className="mt-12 border-t border-brand-700 pt-5">
                <p className="text-sm font-bold">No recruitment fees</p>
                <p className="mt-2 text-xs leading-5 text-brand-200">
                  FRAD will never ask you to pay to apply, interview or receive an offer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-200 bg-surface-100">
          <form method="GET" className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_auto] lg:px-8">
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Search</span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                <input
                  type="search"
                  name="search"
                  defaultValue={searchParams.search || ''}
                  placeholder="Job title or reference"
                  className="h-11 w-full rounded-xl border border-surface-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Team</span>
              <select name="departmentId" defaultValue={searchParams.departmentId || ''} className="h-11 w-full rounded-xl border border-surface-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                <option value="">All teams</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Location</span>
              <select name="dutyStationId" defaultValue={searchParams.dutyStationId || ''} className="h-11 w-full rounded-xl border border-surface-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                <option value="">All locations</option>
                {dutyStations.map((station) => <option key={station.id} value={station.id}>{station.name} ({station.state})</option>)}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11 px-8 rounded-xl shadow-none">
                Search roles
              </button>
              {(searchParams.search || searchParams.departmentId || searchParams.dutyStationId) && (
                <Link href="/careers" className="btn-secondary h-11 px-6 rounded-xl shadow-none">
                  Clear
                </Link>
              )}
            </div>
          </form>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_260px] lg:px-8 lg:py-16">
          <div>
            <div className="mb-5 flex items-end justify-between border-b border-surface-200 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Vacancies</p>
                <h2 className="mt-1 font-display text-2xl text-navy-800">
                  {vacancies.length === 0 ? 'No matching roles' : `${vacancies.length} ${vacancies.length === 1 ? 'role' : 'roles'} available`}
                </h2>
              </div>
            </div>

            {vacancies.length === 0 ? (
              <div className="paper-panel px-6 py-14 text-center">
                <h3 className="font-display text-2xl text-navy-800">Nothing matches those filters.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
                  Clear one or more filters, or return later when new roles have been published.
                </p>
                <Link href="/careers" className="mt-6 inline-flex border-b border-brand-800 pb-1 text-sm font-bold text-brand-800 transition hover:text-brand-600 hover:border-brand-600">
                  View every open role
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {vacancies.map((vacancy) => (
                  <article key={vacancy.id} className="paper-panel group grid gap-5 px-5 py-7 transition hover:shadow-soft-hover sm:px-7 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-500">
                        <span>{vacancy.referenceNumber}</span>
                        <span>{vacancy.contractType.replaceAll('_', ' ')}</span>
                        {vacancy.numberOfPositions > 1 && <span>{vacancy.numberOfPositions} positions</span>}
                      </div>
                      <h3 className="mt-3 font-display text-2xl leading-tight text-navy-800 transition group-hover:text-brand-700 sm:text-[28px]">
                        <Link href={`/careers/${encodeURIComponent(vacancy.referenceNumber)}`}>{vacancy.title}</Link>
                      </h3>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{vacancy.summary}</p>
                      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                        <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>{vacancy.department.name}</span></div>
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span>{vacancy.dutyStation.name}, {vacancy.dutyStation.state}</span></div>
                        <div className="flex items-center gap-2 font-bold text-signal"><CalendarDays className="h-3.5 w-3.5" /><span>Closes {formatDate(vacancy.closingAt)}</span></div>
                      </dl>
                    </div>
                    <Link
                      href={`/careers/${encodeURIComponent(vacancy.referenceNumber)}`}
                      className="inline-flex items-center gap-3 self-start border-b border-brand-800 pb-1 text-xs font-bold text-brand-800 md:self-center"
                    >
                      View role <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="border-t-2 border-brand-700 pt-5">
              <h2 className="font-display text-xl text-navy-800">Before you apply</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Read the person specification carefully. Your application should show how your experience meets the essential requirements.
              </p>
              <Link href="/recruitment-process" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-700 hover:text-brand-600 transition-colors">
                How selection works <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="border-t border-surface-200 pt-5">
              <h2 className="text-sm font-bold text-navy-800">Need help?</h2>
              <p className="mt-2 text-xs leading-5 text-muted">
                Candidate help covers accounts, documents, reasonable adjustments and technical problems.
              </p>
              <Link href="/recruitment-faq" className="mt-3 inline-flex text-xs font-bold text-brand-700 hover:text-brand-600 transition-colors">Candidate help</Link>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}
