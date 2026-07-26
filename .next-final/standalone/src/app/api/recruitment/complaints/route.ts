import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { expectedVersion, staleRecord } from '@/lib/concurrency'
import { logAudit } from '@/lib/audit'
import { enqueueEmail } from '@/lib/outbox'

export async function GET(request: Request) {
  try {
    await requirePermission('complaint.manage')
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const cases = await prisma.complaintCase.findMany({ where: status ? { status } : undefined, include: { comments: { orderBy: { createdAt: 'asc' } }, attachments: true }, orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }] })
    return Response.json({ cases })
  } catch (error) { return authzResponse(error) }
}

const updateSchema = z.object({
  id: z.string().min(1), lockVersion: z.number().int().positive().optional(),
  status: z.enum(['RECEIVED', 'TRIAGED', 'INVESTIGATING', 'AWAITING_INFORMATION', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(), assignedToUserId: z.string().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(), resolution: z.string().trim().min(10).max(10_000).optional(),
  comment: z.string().trim().min(2).max(5000).optional(), internalOnly: z.boolean().default(true),
})

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission('complaint.manage')
    const input = await parseBody(request, updateSchema)
    const requestedStatus = input.status
    const existing = await prisma.complaintCase.findUnique({ where: { id: input.id } })
    if (!existing) throw new AuthzError('Case not found', 404)
    if (requestedStatus === 'RESOLVED' && !input.resolution) throw new AuthzError('Resolution is required when resolving a case', 422)
    if (requestedStatus === 'CLOSED' && !(input.resolution || existing.resolution)) throw new AuthzError('A case cannot be closed without a recorded resolution', 422)
    const version = expectedVersion(request, input) ?? existing.lockVersion
    const update = await prisma.complaintCase.updateMany({ where: { id: input.id, lockVersion: version }, data: {
      status: requestedStatus, priority: input.priority, assignedToUserId: input.assignedToUserId,
      dueAt: input.dueAt, resolution: input.resolution,
      resolvedAt: requestedStatus === 'RESOLVED' ? new Date() : requestedStatus ? null : undefined,
      lockVersion: { increment: 1 },
    } })
    if (!update.count) staleRecord()
    if (input.comment) await prisma.complaintComment.create({ data: { complaintCaseId: input.id, authorUserId: user.userId, body: input.comment, internalOnly: input.internalOnly } })
    const updated = await prisma.complaintCase.findUnique({ where: { id: input.id }, include: { comments: true, attachments: true } })
    if (updated && input.comment && !input.internalOnly && updated.reporterEmail) await enqueueEmail({ recipient: updated.reporterEmail, subject: `Update on ${updated.referenceNumber}`, html: `<p>${input.comment.replace(/[<&]/g, (value) => value === '<' ? '&lt;' : '&amp;')}</p>`, deduplicationKey: `complaint-comment:${updated.comments.at(-1)?.id}` })
    await logAudit({ actorUserId: user.userId, action: 'COMPLAINT_CASE_UPDATED', resourceType: 'ComplaintCase', resourceId: input.id, previousValue: existing, newValue: updated })
    return Response.json({ success: true, case: updated })
  } catch (error) { return authzResponse(error) }
}
