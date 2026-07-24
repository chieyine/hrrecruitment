import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { createNotification } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const { applicationIds, subject, body } = await parseBody(request, z.object({ applicationIds: z.array(z.string()).min(1).max(100), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000) }))
    const applications = await prisma.application.findMany({ where: { id: { in: applicationIds } }, include: { candidate: { select: { userId: true } } } })
    if (applications.length !== new Set(applicationIds).size) throw new AuthzError('One or more applications were not found', 404)
    for (const application of applications) {
      const thread = await prisma.messageThread.create({ data: { applicationId: application.id, subject, category: 'GENERAL' } })
      await prisma.message.create({ data: { messageThreadId: thread.id, senderUserId: user.userId, body } })
      await createNotification({ userId: application.candidate.userId, type: 'MESSAGE_RECEIVED', title: subject, body })
    }
    await logAudit({ actorUserId: user.userId, action: 'APPLICATION_BULK_MESSAGE_SENT', resourceType: 'Application', resourceId: applicationIds.join(','), newValue: { subject, count: applications.length } })
    return Response.json({ success: true, count: applications.length })
  } catch (error) { return authzResponse(error) }
}
