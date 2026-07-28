import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  applicationId: z.string().min(1),
  requestType: z.enum(['ASSESSMENT', 'INTERVIEW', 'COMMUNICATION', 'ACCESSIBILITY', 'OTHER']),
  details: z.string().trim().min(10).max(5000),
})

export async function GET() {
  try {
    const user = await requireUser()
    const requests = await prisma.accommodationRequest.findMany({
      where: {
        applicationId: {
          in: await prisma.application
            .findMany({ where: { candidate: { userId: user.userId } }, select: { id: true } })
            .then((items) => items.map((item) => item.id)),
        },
      },
      orderBy: { requestedAt: 'desc' },
    })
    return Response.json({ requests })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)
    const application = await prisma.application.findFirst({
      where: { id: input.applicationId, candidate: { userId: user.userId } },
      select: { id: true, internalStatus: true },
    })
    if (!application) throw new AuthzError('Application not found', 404)
    if (['WITHDRAWN', 'CANCELLED', 'NOT_SELECTED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)) {
      throw new AuthzError('An accommodation cannot be requested for this closed application', 409)
    }
    const existing = await prisma.accommodationRequest.findFirst({
      where: {
        applicationId: application.id,
        requestType: input.requestType,
        status: { in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED'] },
      },
    })
    if (existing) throw new AuthzError('An active request of this type already exists', 409)
    const created = await prisma.accommodationRequest.create({
      data: { applicationId: application.id, requestType: input.requestType, details: input.details },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'ACCOMMODATION_REQUESTED',
      resourceType: 'AccommodationRequest',
      resourceId: created.id,
      newValue: { requestType: created.requestType },
    })
    return Response.json({ success: true, request: created }, { status: 201 })
  } catch (error) {
    return authzResponse(error)
  }
}
