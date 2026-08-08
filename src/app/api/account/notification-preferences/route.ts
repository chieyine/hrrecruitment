import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const user = await requireUser()
    const preference = await prisma.notificationPreference.findUnique({ where: { userId: user.userId } })
    return Response.json({ preference: preference || { immediateEmailEnabled: true, digestEnabled: true, digestHourLocal: 8 } })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, z.object({ immediateEmailEnabled: z.boolean(), digestEnabled: z.boolean(), digestHourLocal: z.coerce.number().int().min(0).max(23) }))
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: user.userId },
      update: input,
      create: { userId: user.userId, ...input },
    })
    await logAudit({ actorUserId: user.userId, action: 'NOTIFICATION_PREFERENCES_UPDATED', resourceType: 'NotificationPreference', resourceId: preference.id, newValue: input })
    return Response.json({ success: true, preference })
  } catch (error) {
    return authzResponse(error)
  }
}
