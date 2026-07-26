import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  outcome: z.enum(['RESUMED', 'DID_NOT_RESUME', 'POSTPONED', 'WITHDRAWN']),
  actualStartDate: z.coerce.date().optional(),
  reportingLocation: z.string().trim().min(1).max(300),
  supervisorConfirmation: z.boolean().default(false),
  comment: z.string().max(2000).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requirePermission('resumption.confirm')
    const data = await parseBody(request, schema)
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { candidate: true, offers: { where: { status: 'ACCEPTED' }, orderBy: { acceptedAt: 'desc' }, take: 1 } },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.internalStatus !== 'READY_TO_RESUME') {
      return NextResponse.json({ error: `Resumption can only be recorded from READY_TO_RESUME, not ${application.internalStatus}` }, { status: 422 })
    }
    if (data.outcome === 'RESUMED' && (!data.actualStartDate || !data.supervisorConfirmation)) {
      return NextResponse.json({ error: 'Actual start date and supervisor confirmation are required' }, { status: 400 })
    }

    const nextStatus = data.outcome === 'RESUMED' ? 'RESUMED' : data.outcome === 'WITHDRAWN' ? 'WITHDRAWN' : data.outcome === 'DID_NOT_RESUME' ? 'CANCELLED' : 'READY_TO_RESUME'
    const candidateStatus = data.outcome === 'RESUMED' ? 'RESUMED' : data.outcome === 'WITHDRAWN' ? 'WITHDRAWN' : data.outcome === 'DID_NOT_RESUME' ? 'NOT_SELECTED' : 'READY_TO_RESUME'
    const record = await prisma.$transaction(async (tx) => {
      const saved = await tx.resumptionRecord.upsert({
        where: { applicationId: application.id },
        update: { ...data, confirmedBy: user.userId, plannedStartDate: data.outcome === 'POSTPONED' && data.actualStartDate ? data.actualStartDate : undefined },
        create: { applicationId: application.id, plannedStartDate: application.offers[0]?.startDate || data.actualStartDate || new Date(), ...data, confirmedBy: user.userId },
      })
      if (nextStatus !== application.internalStatus) {
        await tx.application.update({ where: { id: application.id }, data: { internalStatus: nextStatus, candidateVisibleStatus: candidateStatus, lockVersion: { increment: 1 } } })
        await tx.applicationStageHistory.create({ data: { applicationId: application.id, fromStatus: application.internalStatus, toStatus: nextStatus, changedBy: user.userId, reason: data.comment || `Resumption outcome: ${data.outcome}` } })
      }
      return saved
    })
    if (application.candidate.userId && data.outcome !== 'RESUMED') await createNotification({
      userId: application.candidate.userId,
      type: 'RESUMPTION_UPDATE',
      title: data.outcome === 'POSTPONED' ? 'Start date update recorded' : 'Recruitment status updated',
      body: data.outcome === 'POSTPONED' ? 'HR has recorded a change to your planned start. Check your preboarding page or messages for details.' : 'HR has updated the resumption outcome for your application.',
    })
    await logAudit({ actorUserId: user.userId, action: 'RESUMPTION_RECORDED', resourceType: 'ResumptionRecord', resourceId: record.id, newValue: data })
    return NextResponse.json({ success: true, resumption: record })
  } catch (err) {
    return authzResponse(err)
  }
}
