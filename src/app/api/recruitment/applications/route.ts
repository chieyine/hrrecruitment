import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const mayReadAll = await hasPermission(user.userId, 'application.read.all')
    const mayReadAssigned = await hasPermission(user.userId, 'application.read.assigned')
    if (!mayReadAll && !mayReadAssigned) throw new AuthzError('Forbidden', 403)
    const query = new URL(request.url).searchParams
    const search = query.get('search')?.trim()
    const status = query.get('status')?.trim()
    const vacancyId = query.get('vacancyId')?.trim()
    const applications = await prisma.application.findMany({
      where: {
        ...(status ? { internalStatus: status } : {}),
        ...(vacancyId ? { vacancyId } : {}),
        AND: [
          ...(mayReadAll ? [] : [{ OR: [{ assignedReviewerId: user.userId }, { vacancy: { ownerUserId: user.userId } }, { interviews: { some: { panelMembers: { some: { userId: user.userId } } } } }] }]),
          ...(search ? [{ OR: [{ vacancy: { title: { contains: search } } }, { vacancy: { referenceNumber: { contains: search } } }, { candidate: { legalFirstName: { contains: search } } }, { candidate: { lastName: { contains: search } } }, { candidate: { user: { email: { contains: search } } } }] }] : []),
        ],
      },
      include: { candidate: { select: { id: true, legalFirstName: true, lastName: true, user: { select: { email: true } } } }, vacancy: { select: { id: true, title: true, referenceNumber: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
    return Response.json({ applications })
  } catch (error) { return authzResponse(error) }
}
