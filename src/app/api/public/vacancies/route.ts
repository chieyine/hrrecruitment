import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { getVerifiedUser } from '@/lib/auth'
import { visibleAudiencesFor } from '@/lib/internal-identity'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** Public endpoints must be bounded: this is the only unauthenticated list. */
const MAX_PAGE_SIZE = 50
const MAX_SEARCH_LENGTH = 100

export async function GET(request: Request) {
  try {
    const rl = await rateLimitDistributed(`public-vacancies:${clientIp(request)}`, 60, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const departmentId = searchParams.get('departmentId')
    const dutyStationId = searchParams.get('dutyStationId')
    const categoryId = searchParams.get('categoryId')
    const contractType = searchParams.get('contractType')
    // Cap the search term: an unbounded string becomes an unbounded LIKE scan.
    const search = searchParams.get('search')?.trim().slice(0, MAX_SEARCH_LENGTH) || ''
    const requestedSize = Number(searchParams.get('pageSize'))
    const pageSize =
      Number.isInteger(requestedSize) && requestedSize > 0 ? Math.min(requestedSize, MAX_PAGE_SIZE) : MAX_PAGE_SIZE
    const requestedPage = Number(searchParams.get('page'))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

    const now = new Date()
    // §28.8 The apply flow reads this endpoint, so it has to serve internal
    // vacancies to verified staff — otherwise an internal candidate could see a
    // role on the careers page and then fail to open it. Everyone else, signed
    // in or not, sees public roles only.
    const viewer = await getVerifiedUser()
    const where: Record<string, unknown> = {
      status: 'OPEN',
      openingAt: { lte: now },
      closingAt: { gte: now },
      audience: { in: visibleAudiencesFor(viewer) },
    }

    // A direct id lookup keeps the apply page from paging the whole list.
    if (id) where.id = id
    if (departmentId) where.departmentId = departmentId
    if (dutyStationId) where.dutyStationId = dutyStationId
    if (categoryId) where.categoryId = categoryId
    if (contractType) where.contractType = contractType
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [vacancies, total] = await Promise.all([
      prisma.vacancy.findMany({
        where,
        include: {
          department: true,
          dutyStation: true,
          project: true,
          category: true,
          questions: { orderBy: { displayOrder: 'asc' } },
          requiredDocuments: true,
        },
        orderBy: { closingAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vacancy.count({ where }),
    ])

    return NextResponse.json({ vacancies, page, pageSize, total, hasMore: page * pageSize < total })
  } catch (error) {
    logger.error('Error fetching public vacancies', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to load vacancies' }, { status: 500 })
  }
}
