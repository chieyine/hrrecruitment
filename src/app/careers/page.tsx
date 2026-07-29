import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Building2, CalendarDays, MapPin, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Open roles',
  description: 'View current FRAD vacancies and apply through the official candidate portal.',
}

export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    departmentId?: string
    categoryId?: string
    dutyStationId?: string
    page?: string
  }>
}) {
  const query = await searchParams
  const requestedPage = Number.parseInt(query.page || '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 20
  const user = await getVerifiedUser()
  const [departments, categories, dutyStations] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.vacancyCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.dutyStation.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ])

  const where: Prisma.VacancyWhereInput = {
    status: 'OPEN',
    openingAt: { lte: new Date() },
    closingAt: { gt: new Date() },
  }

  if (query.departmentId) where.departmentId = query.departmentId
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.dutyStationId) where.dutyStationId = query.dutyStationId
  // Cap the untrusted search term: it comes straight from a public query
  // string and otherwise drives an unbounded LIKE scan.
  const search = query.search?.trim().slice(0, 100)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [vacancies, totalVacancies] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      include: { department: true, category: true, dutyStation: true },
      orderBy: [{ closingAt: 'asc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vacancy.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(totalVacancies / pageSize))
  const pageHref = (target: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (query.departmentId) params.set('departmentId', query.departmentId)
    if (query.categoryId) params.set('categoryId', query.categoryId)
    if (query.dutyStationId) params.set('dutyStationId', query.dutyStationId)
    if (target > 1) params.set('page', String(target))
    const suffix = params.toString()
    return suffix ? `/careers?${suffix}` : '/careers'
  }
  if (totalVacancies > 0 && page > totalPages) redirect(pageHref(totalPages))

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1">
        <section className="border-b border-surface-200 bg-[#f8f6f0]">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_380px]">
            <div className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
              <span className="editorial-kicker">Careers at FRAD Foundation</span>
              <h1 className="editorial-title mt-6 max-w-3xl text-5xl text-navy-900 sm:text-6xl">
                Find your next role at FRAD Foundation
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                View current openings, check the requirements and apply online.
              </p>
            </div>

            <div className="flex flex-col justify-between border-l-4 border-[#bc6747] bg-brand-950 px-7 py-9 text-white sm:px-9 lg:py-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">Applications open</p>
                <p className="mt-5 text-5xl font-semibold tracking-[-.04em]">{totalVacancies}</p>
                <p className="mt-1 text-sm text-brand-100">
                  {totalVacancies === 1 ? 'role available now' : 'roles available now'}
                </p>
              </div>
              <div className="mt-12 border-t border-brand-800 pt-5">
                <p className="text-sm font-bold">Applying costs nothing</p>
                <p className="mt-2 text-xs leading-5 text-brand-200">
                  FRAD never asks for payment to apply, attend an interview or receive an offer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-200 bg-surface-100">
          <form
            method="GET"
            className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:px-8"
          >
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Search</span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                <input
                  type="search"
                  name="search"
                  defaultValue={query.search || ''}
                  placeholder="Job title or reference"
                  className="h-11 w-full rounded-xl border border-surface-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Type of work
              </span>
              <select
                name="categoryId"
                defaultValue={query.categoryId || ''}
                className="h-11 w-full rounded-xl border border-surface-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All job families</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Team</span>
              <select
                name="departmentId"
                defaultValue={query.departmentId || ''}
                className="h-11 w-full rounded-xl border border-surface-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All teams</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Location</span>
              <select
                name="dutyStationId"
                defaultValue={query.dutyStationId || ''}
                className="h-11 w-full rounded-xl border border-surface-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All locations</option>
                {dutyStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} ({station.state})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11 px-8 rounded-xl shadow-none">
                Search roles
              </button>
              {(query.search || query.departmentId || query.categoryId || query.dutyStationId) && (
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
                <h2 className="mt-1 text-2xl font-semibold tracking-[-.025em] text-navy-900">
                  {totalVacancies === 0
                    ? 'No roles match those filters'
                    : `${totalVacancies} ${totalVacancies === 1 ? 'role is' : 'roles are'} open`}
                </h2>
              </div>
            </div>

            {totalVacancies === 0 ? (
              <div className="paper-panel px-6 py-14 text-center">
                <h3 className="text-xl font-semibold text-navy-900">Try widening your search.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
                  Clear one or more filters. New roles are added here as soon as applications open.
                </p>
                <Link
                  href="/careers"
                  className="mt-6 inline-flex border-b border-brand-800 pb-1 text-sm font-bold text-brand-800 transition hover:text-brand-600 hover:border-brand-600"
                >
                  View every open role
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {vacancies.map((vacancy) => (
                  <article
                    key={vacancy.id}
                    className="paper-panel group grid gap-5 px-5 py-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft-hover sm:px-7 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-500">
                        <span>{vacancy.referenceNumber}</span>
                        <span>{vacancy.contractType.replaceAll('_', ' ')}</span>
                        {vacancy.category && <span>{vacancy.category.name}</span>}
                        {vacancy.numberOfPositions > 1 && <span>{vacancy.numberOfPositions} positions</span>}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold leading-tight tracking-[-.025em] text-navy-900 transition group-hover:text-brand-700 sm:text-2xl">
                        <Link href={`/careers/${encodeURIComponent(vacancy.referenceNumber)}`}>{vacancy.title}</Link>
                      </h3>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{vacancy.summary}</p>
                      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{vacancy.department.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>
                            {vacancy.dutyStation.name}, {vacancy.dutyStation.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-signal">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>Closes {formatDate(vacancy.closingAt)}</span>
                        </div>
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
                {totalPages > 1 && (
                  <nav
                    aria-label="Open roles pages"
                    className="flex items-center justify-between border-t border-stone-300 pt-5"
                  >
                    <Link
                      href={pageHref(Math.max(1, page - 1))}
                      aria-disabled={page <= 1}
                      className={`text-sm font-semibold ${
                        page <= 1 ? 'pointer-events-none text-stone-400' : 'text-brand-800 hover:underline'
                      }`}
                    >
                      Previous
                    </Link>
                    <p className="text-sm text-stone-500">
                      Page {Math.min(page, totalPages)} of {totalPages}
                    </p>
                    <Link
                      href={pageHref(Math.min(totalPages, page + 1))}
                      aria-disabled={page >= totalPages}
                      className={`text-sm font-semibold ${
                        page >= totalPages
                          ? 'pointer-events-none text-stone-400'
                          : 'text-brand-800 hover:underline'
                      }`}
                    >
                      Next
                    </Link>
                  </nav>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="border-t-2 border-brand-700 pt-5">
              <h2 className="text-lg font-semibold text-navy-900">Applying to FRAD</h2>
              <p className="mt-3 text-sm leading-6 text-muted">See each step from application to final decision.</p>
              <Link
                href="/guidance"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-700 hover:text-brand-600 transition-colors"
              >
                View the recruitment process <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="border-t border-surface-200 pt-5">
              <h2 className="text-sm font-bold text-navy-800">Help with an application</h2>
              <p className="mt-2 text-xs leading-5 text-muted">Find answers or request an adjustment.</p>
              <Link
                href="/recruitment-faq"
                className="mt-3 inline-flex text-xs font-bold text-brand-700 hover:text-brand-600 transition-colors"
              >
                Candidate help
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}
