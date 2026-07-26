import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requirePermission('application.stage.change')

    const { reviewerUserId } = await parseBody(request, z.object({ reviewerUserId: z.string().min(1) }))

    const [application, reviewer] = await Promise.all([
      prisma.application.findUnique({ where: { id: params.id } }),
      prisma.user.findUnique({
        where: { id: reviewerUserId },
        include: { userRoles: { include: { role: true } } },
      }),
    ])
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!reviewer) return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 })
    if (reviewer.accountStatus !== 'ACTIVE') throw new AuthzError('Reviewer account is not active', 409)
    const isStaff = hasStaffRole(reviewer.userRoles.map((assignment) => assignment.role.name))
    const canReview = await hasPermission(reviewer.id, 'application.read.assigned', {
      type: 'VACANCY',
      id: application.vacancyId,
    }) || await hasPermission(reviewer.id, 'application.read.all')
    if (!isStaff || !canReview) throw new AuthzError('Selected user is not configured to review applications', 422)

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: { assignedReviewerId: reviewerUserId },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'REVIEWER_ASSIGNED',
      resourceType: 'Application',
      resourceId: params.id,
      newValue: { reviewerUserId },
    })

    return NextResponse.json({ application: updated })
  } catch (err) {
    return authzResponse(err)
  }
}
