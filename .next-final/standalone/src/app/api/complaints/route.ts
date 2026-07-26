import { z } from 'zod'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { parseBody } from '@/lib/validation'
import { authzResponse, AuthzError } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { enqueueEmail } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'

const intakeSchema = z.object({
  category: z.enum(['COMPLAINT', 'APPEAL', 'SAFEGUARDING', 'FRAUD', 'ACCOMMODATION', 'PRIVACY', 'OTHER']),
  subject: z.string().trim().min(5).max(200), description: z.string().trim().min(20).max(10_000),
  reporterEmail: z.string().trim().toLowerCase().email().optional(), applicationId: z.string().optional(),
  attachmentFileIds: z.array(z.string().min(1)).max(5).default([]),
})

export async function GET() {
  try {
    const user = await getVerifiedUser()
    if (!user) throw new AuthzError('Authentication required', 401)
    const cases = await prisma.complaintCase.findMany({
      where: { reporterUserId: user.userId },
      select: { id: true, referenceNumber: true, category: true, subject: true, status: true, priority: true, dueAt: true, resolution: true, createdAt: true, updatedAt: true, comments: { where: { internalOnly: false }, select: { id: true, body: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ cases })
  } catch (error) { return authzResponse(error) }
}

export async function POST(request: Request) {
  try {
    const limit = await rateLimitDistributed(`complaint:${clientIp(request)}`, 5, 60 * 60_000)
    if (!limit.allowed) return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
    const user = await getVerifiedUser()
    const input = await parseBody(request, intakeSchema)
    const attachmentFileIds = input.attachmentFileIds ?? []
    if (!user && !input.reporterEmail) throw new AuthzError('Email is required for anonymous submissions', 400)
    if (input.applicationId && user) {
      const owned = await prisma.application.findFirst({ where: { id: input.applicationId, candidate: { userId: user.userId } }, select: { id: true } })
      if (!owned) throw new AuthzError('Application not found', 404)
    }
    if (attachmentFileIds.length) {
      if (!user) throw new AuthzError('Sign in before attaching files', 401)
      const count = await prisma.fileAsset.count({ where: { id: { in: attachmentFileIds }, ownerUserId: user.userId, virusScanStatus: 'CLEAN' } })
      if (count !== attachmentFileIds.length) throw new AuthzError('One or more attachments are unavailable', 400)
    }
    const referenceNumber = `FRAD-CASE-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
    const dueDays = input.category === 'SAFEGUARDING' ? 1 : input.category === 'FRAUD' ? 2 : 7
    const created = await prisma.complaintCase.create({ data: {
      referenceNumber, reporterUserId: user?.userId || null, reporterEmail: input.reporterEmail || user?.email || null,
      applicationId: input.applicationId || null, category: input.category, subject: input.subject,
      description: input.description, priority: input.category === 'SAFEGUARDING' ? 'CRITICAL' : input.category === 'FRAUD' ? 'HIGH' : 'NORMAL',
      dueAt: new Date(Date.now() + dueDays * 86_400_000),
      attachments: attachmentFileIds.length ? { create: attachmentFileIds.map((fileAssetId) => ({ fileAssetId, uploadedBy: user?.userId || null })) } : undefined,
    } })
    const recipient = input.reporterEmail || user?.email
    if (recipient) await enqueueEmail({ recipient, subject: `FRAD case received: ${referenceNumber}`, html: `<p>We received your submission. Your reference is <strong>${referenceNumber}</strong>. Keep this reference for follow-up.</p>`, deduplicationKey: `complaint-ack:${created.id}` })
    await prisma.complaintCase.update({ where: { id: created.id }, data: { acknowledgementSentAt: recipient ? new Date() : null } })
    await logAudit({ actorUserId: user?.userId, action: 'COMPLAINT_CASE_CREATED', resourceType: 'ComplaintCase', resourceId: created.id, newValue: { category: created.category, referenceNumber } })
    return Response.json({ success: true, referenceNumber, status: created.status }, { status: 201 })
  } catch (error) { return authzResponse(error) }
}
