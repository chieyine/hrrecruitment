import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'FULFILLED']),
  decision: z.string().trim().min(10).max(5000),
})

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
    const input = await parseBody(request, schema)
    const current = await prisma.accommodationRequest.findUnique({ where: { id: input.id } })
    if (!current) throw new AuthzError('Accommodation request not found', 404)
    if (['DECLINED', 'FULFILLED'].includes(current.status)) throw new AuthzError('This request is closed', 409)
    const updated = await prisma.accommodationRequest.updateMany({
      where: { id: current.id, status: current.status },
      data: {
        status: input.status, decision: input.decision,
        reviewedBy: user.userId, reviewedAt: new Date(),
        fulfilledAt: input.status === 'FULFILLED' ? new Date() : null,
      },
    })
    if (updated.count !== 1) throw new AuthzError('This request changed; refresh and try again', 409)
    const application = await prisma.application.findUnique({ where: { id: current.applicationId }, select: { candidate: { select: { userId: true } } } })
    if (application?.candidate.userId) await createNotification({ userId: application.candidate.userId, type: 'ACCOMMODATION_UPDATED', title: 'Update on your adjustment request', body: `Your adjustment request is now ${input.status.replaceAll('_', ' ').toLowerCase()}. Open the request to read HR's decision.` })
    await logAudit({
      actorUserId: user.userId,
      action: `ACCOMMODATION_${input.status}`,
      resourceType: 'AccommodationRequest',
      resourceId: current.id,
      previousValue: { status: current.status },
      newValue: { status: input.status },
      reason: input.decision,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
