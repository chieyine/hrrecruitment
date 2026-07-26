import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { pageRequest, paginatedAs } from '@/lib/pagination'
import { assignedApplicationWhere } from '@/lib/recruitment-access'

export const dynamic = 'force-dynamic'

/** Columns a caller may sort by. An open sort parameter is an injection surface. */
const SORTABLE = {
  updated: { updatedAt: 'desc' },
  oldest: { createdAt: 'asc' },
  newest: { createdAt: 'desc' },
  score: { finalScore: 'desc' },
  surname: { candidate: { lastName: 'asc' } },
} as const

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const mayReadAll = await hasPermission(user.userId, 'application.read.all')
    const mayReadAssigned = await hasPermission(user.userId, 'application.read.assigned')
    if (!mayReadAll && !mayReadAssigned) throw new AuthzError('Forbidden', 403)

    const query = new URL(request.url).searchParams
    // Cap the search term: it drives five LIKE comparisons.
    const search = query.get('search')?.trim().slice(0, 100)
    const status = query.get('status')?.trim()
    const vacancyId = query.get('vacancyId')?.trim()
    const sortKey = (query.get('sort') || 'updated') as keyof typeof SORTABLE
    if (!(sortKey in SORTABLE)) throw new AuthzError(`sort must be one of: ${Object.keys(SORTABLE).join(', ')}`, 400)

    const page = pageRequest(query)

    const where = {
      ...(status ? { internalStatus: status } : {}),
      ...(vacancyId ? { vacancyId } : {}),
      AND: [
        ...(mayReadAll ? [] : [assignedApplicationWhere(user.userId)]),
        ...(search
          ? [
              {
                OR: [
                  { vacancy: { title: { contains: search, mode: 'insensitive' as const } } },
                  { vacancy: { referenceNumber: { contains: search, mode: 'insensitive' as const } } },
                  { candidate: { legalFirstName: { contains: search, mode: 'insensitive' as const } } },
                  { candidate: { lastName: { contains: search, mode: 'insensitive' as const } } },
                  { candidate: { user: { email: { contains: search, mode: 'insensitive' as const } } } },
                ],
              },
            ]
          : []),
      ],
    }

    // The count runs alongside the page so the UI can show real totals instead
    // of silently truncating at a fixed ceiling of 500 rows.
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          candidate: { select: { id: true, legalFirstName: true, lastName: true, user: { select: { email: true } } } },
          vacancy: { select: { id: true, title: true, referenceNumber: true } },
        },
        orderBy: SORTABLE[sortKey],
        skip: page.skip,
        take: page.take,
      }),
      prisma.application.count({ where }),
    ])

    return Response.json(paginatedAs('applications', applications, total, page))
  } catch (error) {
    return authzResponse(error)
  }
}
