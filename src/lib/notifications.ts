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

const IMMEDIATE_EMAIL_TYPES = [
  'SECURITY',
  'ACCOUNT_',
  'PASSWORD_',
  'MFA_',
  'OFFER_',
  'ASSESSMENT_INVITED',
  'INTERVIEW_INVITED',
  'REFERENCE_REQUESTED',
  'APPLICATION_SUBMITTED',
  'APPLICATION_RECEIVED',
]

function isImmediateEmailType(type: string) {
  return IMMEDIATE_EMAIL_TYPES.some((prefix) => type === prefix || type.startsWith(prefix))
}

export async function createNotification(params: CreateNotificationParams) {
  const preference = params.deliveryChannels
    ? null
    : await prisma.notificationPreference.findUnique({ where: { userId: params.userId } })
  const channels = params.deliveryChannels || [
    'IN_APP',
    ...(isImmediateEmailType(params.type) && (preference?.immediateEmailEnabled ?? true) ? ['EMAIL'] : []),
    ...(!isImmediateEmailType(params.type) && (preference?.digestEnabled ?? true) ? ['DIGEST'] : []),
  ]
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
