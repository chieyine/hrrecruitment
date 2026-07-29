import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { rateLimitDistributed } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const { body } = await parseBody(request, z.object({ body: z.string().trim().min(2).max(5_000) }))
    const limit = await rateLimitDistributed(`complaint-reply:${user.userId}`, 20, 60 * 60_000)
    if (!limit.allowed) {
      return Response.json(
        { error: 'Too many replies. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const complaint = await prisma.complaintCase.findFirst({
      where: { id, reporterUserId: user.userId },
      select: { id: true, status: true, assignedToUserId: true, referenceNumber: true },
    })
    if (!complaint) throw new AuthzError('Case not found', 404)
    if (['RESOLVED', 'CLOSED'].includes(complaint.status)) {
      throw new AuthzError('This case is closed. Submit a new concern if another matter needs review.', 409)
    }
    const comment = await prisma.complaintComment.create({
      data: {
        complaintCaseId: complaint.id,
        authorUserId: user.userId,
        body,
        internalOnly: false,
      },
    })
    if (complaint.assignedToUserId) {
      await createNotification({
        userId: complaint.assignedToUserId,
        type: 'COMPLAINT_REPLY_RECEIVED',
        title: 'Reporter replied to a concern',
        body: `${complaint.referenceNumber} has a new reply.`,
      })
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'COMPLAINT_REPORTER_REPLIED',
      resourceType: 'ComplaintCase',
      resourceId: complaint.id,
    })
    return Response.json({ success: true, commentId: comment.id }, { status: 201 })
  } catch (error) {
    return authzResponse(error)
  }
}
