import { prisma } from './prisma'
import { protectOutboxPayload } from './outbox'

export interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  body: string
  deliveryChannels?: string[]
  applicationId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const channels = params.deliveryChannels || ['IN_APP', 'EMAIL']
  const user = channels.includes('EMAIL')
    ? await prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } })
    : null
  const notification = await prisma.$transaction(async (tx) => {
    const created = await tx.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        deliveryChannelsJson: JSON.stringify(channels),
        status: 'UNREAD',
      },
    })
    if (user?.email)
      await tx.outboxMessage.create({
        data: {
          channel: 'EMAIL',
          recipient: user.email,
          subject: params.title,
          applicationId: params.applicationId || null,
          payloadJson: protectOutboxPayload({
            html: `<p>${params.body.replace(/[<&]/g, (char) => (char === '<' ? '&lt;' : '&amp;'))}</p>`,
          }),
          deduplicationKey: `notification:${created.id}:email`,
        },
      })
    return created
  })
  return notification
}
