import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'

export async function GET() {
  try {
    const user = await requireUser()
    const notifications = await prisma.notification.findMany({ where: { userId: user.userId }, orderBy: { sentAt: 'desc' }, take: 50 })
    return Response.json({ notifications, unreadCount: notifications.filter((notification) => notification.status === 'UNREAD').length })
  } catch (error) { return authzResponse(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const { id } = await parseBody(request, z.object({ id: z.string().optional(), all: z.boolean().optional() }).refine((value) => value.id || value.all, 'Choose a notification or all notifications'))
    if (id) {
      const result = await prisma.notification.updateMany({ where: { id, userId: user.userId }, data: { status: 'READ', readAt: new Date() } })
      if (!result.count) throw new AuthzError('Notification not found', 404)
    } else await prisma.notification.updateMany({ where: { userId: user.userId, status: 'UNREAD' }, data: { status: 'READ', readAt: new Date() } })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}
