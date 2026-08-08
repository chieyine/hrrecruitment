import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { REPORT_TYPE_VALUES } from '@/lib/recruitment-reports.server'

const REPORTS = REPORT_TYPE_VALUES

export async function GET() {
  try {
    const user = await requirePermission('report.export')
    const schedules = await prisma.scheduledReport.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ schedules })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('report.export')
    const input = await parseBody(
      request,
      z.object({
        reportType: z.enum(REPORTS),
        format: z.enum(['csv', 'xlsx', 'pdf']),
        frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
        recipientEmail: z.string().email(),
        nextRunAt: z.coerce.date(),
      })
    )
    const recipientDomain = input.recipientEmail.split('@')[1].toLowerCase()
    const configuredDomains = (process.env.REPORT_RECIPIENT_DOMAINS || user.email.split('@')[1])
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (!configuredDomains.includes(recipientDomain))
      throw new AuthzError('Scheduled reports may only be sent to an approved organisation email domain', 400)
    const [complaints, audit, governance, references, offers, preboarding] = await Promise.all([
      hasPermission(user.userId, 'complaint.manage'),
      hasPermission(user.userId, 'audit.read'),
      hasPermission(user.userId, 'governance.manage'),
      hasPermission(user.userId, 'reference.manage'),
      hasPermission(user.userId, 'offer.manage'),
      hasPermission(user.userId, 'preboarding.manage'),
    ])
    const auditor = user.roles.includes('AUDITOR')
    const allowed = (() => {
      if (auditor && !['complaints', 'configuration-changes'].includes(input.reportType)) return true
      if (input.reportType === 'complaints') return complaints
      if (input.reportType === 'audit') return audit
      if (['configuration-changes', 'privacy-deletions', 'delivery', 'data-quality'].includes(input.reportType))
        return governance
      if (input.reportType === 'references') return references
      if (input.reportType === 'offers') return offers
      if (
        ['preboarding', 'outstanding', 'courses', 'readiness', 'resumption', 'erp', 'waivers'].includes(
          input.reportType
        )
      )
        return preboarding
      return true
    })()
    if (!allowed) throw new AuthzError('You do not have permission to schedule this restricted report', 403)
    if (input.nextRunAt <= new Date()) throw new AuthzError('First delivery must be in the future', 400)
    const schedule = await prisma.scheduledReport.create({ data: { ...input, userId: user.userId } })
    await logAudit({
      actorUserId: user.userId,
      action: 'REPORT_SCHEDULE_CREATED',
      resourceType: 'ScheduledReport',
      resourceId: schedule.id,
      newValue: input,
    })
    return Response.json({ success: true, schedule })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission('report.export')
    const input = await parseBody(request, z.object({ id: z.string().uuid() }))
    const changed = await prisma.scheduledReport.updateMany({
      where: { id: input.id, userId: user.userId },
      data: { active: false },
    })
    if (!changed.count) throw new AuthzError('Schedule not found', 404)
    await logAudit({
      actorUserId: user.userId,
      action: 'REPORT_SCHEDULE_DISABLED',
      resourceType: 'ScheduledReport',
      resourceId: input.id,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
