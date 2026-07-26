import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { AUTOMATIONS, recordAutomation, type AutomationCode } from '@/lib/automations'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireRole('SYSTEM_ADMIN', 'HR_MANAGER')
    const [controls, recent] = await Promise.all([
      prisma.automationControl.findMany(),
      prisma.automationActionLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ])
    const byCode = new Map(controls.map((item) => [item.code, item]))
    return Response.json({
      controls: AUTOMATIONS.map((definition) => ({ ...definition, mode: byCode.get(definition.code)?.mode || 'ACTIVE', settingsJson: byCode.get(definition.code)?.settingsJson || '{}', updatedAt: byCode.get(definition.code)?.updatedAt || null })),
      recent,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('SYSTEM_ADMIN', 'HR_MANAGER')
    const body = await parseBody(request, z.object({
      code: z.enum(AUTOMATIONS.map((item) => item.code) as [AutomationCode, ...AutomationCode[]]),
      mode: z.enum(['ACTIVE', 'PREVIEW', 'PAUSED']),
      reason: z.string().trim().min(10).max(1000),
      settingsJson: z.string().optional(),
    }))
    const definition = AUTOMATIONS.find((item) => item.code === body.code)
    if (!definition) throw new AuthzError('Unknown automation', 400)
    if (body.settingsJson) {
      try { JSON.parse(body.settingsJson) } catch { throw new AuthzError('Settings must be valid JSON', 400) }
    }
    const previous = await prisma.automationControl.findUnique({ where: { code: body.code } })
    const control = await prisma.automationControl.upsert({
      where: { code: body.code },
      update: { mode: body.mode, settingsJson: body.settingsJson || previous?.settingsJson || '{}', updatedBy: user.userId, ...(body.mode === 'PREVIEW' ? { lastPreviewAt: new Date() } : {}) },
      create: { code: body.code, name: definition.name, description: definition.description, mode: body.mode, settingsJson: body.settingsJson || '{}', updatedBy: user.userId, ...(body.mode === 'PREVIEW' ? { lastPreviewAt: new Date() } : {}) },
    })
    await logAudit({ actorUserId: user.userId, action: 'AUTOMATION_CONTROL_CHANGED', resourceType: 'AutomationControl', resourceId: control.id, previousValue: previous, newValue: control, reason: body.reason })
    return Response.json({ control })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('SYSTEM_ADMIN', 'HR_MANAGER')
    const body = await parseBody(request, z.object({
      code: z.enum(AUTOMATIONS.map((item) => item.code) as [AutomationCode, ...AutomationCode[]]),
      targetType: z.string().trim().min(1).max(100),
      targetId: z.string().trim().min(1).max(200),
      reason: z.string().trim().min(10).max(1000),
    }))
    await recordAutomation({ code: body.code, action: 'MANUAL_OVERRIDE', targetType: body.targetType, targetId: body.targetId, status: 'OVERRIDDEN', details: { reason: body.reason }, actorUserId: user.userId })
    await prisma.automationControl.updateMany({ where: { code: body.code }, data: { lastOverriddenAt: new Date(), updatedBy: user.userId } })
    await logAudit({ actorUserId: user.userId, action: 'AUTOMATION_OVERRIDDEN', resourceType: body.targetType, resourceId: body.targetId, reason: body.reason, newValue: { automationCode: body.code } })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
