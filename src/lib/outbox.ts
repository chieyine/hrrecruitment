import { prisma } from './prisma'
import { sendEmail } from './mailer'
import { logger } from './logger'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto'

type EmailPayload = { html: string; text?: string; attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }> }

function outboxKey() {
  const secret = process.env.OUTBOX_ENCRYPTION_KEY || process.env.STORAGE_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('OUTBOX_ENCRYPTION_KEY must be configured in production')
    return null
  }
  return createHash('sha256').update(secret).digest()
}

export function protectOutboxPayload(value: EmailPayload) {
  const plaintext = JSON.stringify(value)
  const key = outboxKey()
  if (!key) return plaintext
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `enc:v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`
}

function readOutboxPayload(value: string): EmailPayload {
  if (!value.startsWith('enc:v1:')) return JSON.parse(value) as EmailPayload
  const key = outboxKey()
  if (!key) throw new Error('Outbox decryption key is unavailable')
  const [, , iv, tag, ciphertext] = value.split(':')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')) as EmailPayload
}

export async function enqueueEmail(input: { recipient: string; subject: string; html: string; text?: string; applicationId?: string; attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>; deduplicationKey?: string; availableAt?: Date }) {
  return prisma.outboxMessage.create({
    data: {
      channel: 'EMAIL', recipient: input.recipient, subject: input.subject,
      applicationId: input.applicationId || null,
      payloadJson: protectOutboxPayload({ html: input.html, text: input.text, attachments: input.attachments?.map((item) => ({ filename: item.filename, contentBase64: item.content.toString('base64'), contentType: item.contentType })) }),
      deduplicationKey: input.deduplicationKey || null,
      availableAt: input.availableAt || new Date(),
    },
  })
}

export async function processOutboxBatch(limit = 25) {
  const now = new Date()
  // Reclaim messages from interrupted workers after ten minutes.
  await prisma.outboxMessage.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: 'PENDING', lockedAt: null, leaseOwner: null },
  })
  const candidates = await prisma.outboxMessage.findMany({
    where: { status: { in: ['PENDING', 'FAILED'] }, availableAt: { lte: now }, attempts: { lt: 5 } },
    orderBy: { createdAt: 'asc' }, take: Math.max(1, Math.min(limit, 100)),
  })
  let delivered = 0
  let failed = 0
  let deadLettered = 0
  for (const message of candidates) {
    const leaseOwner = randomUUID()
    const claimed = await prisma.outboxMessage.updateMany({
      where: { id: message.id, status: { in: ['PENDING', 'FAILED'] }, lockedAt: null, leaseOwner: null },
      data: { status: 'PROCESSING', lockedAt: now, leaseOwner, attempts: { increment: 1 } },
    })
    if (!claimed.count) continue
    try {
      if (message.channel !== 'EMAIL') throw new Error(`Unsupported outbox channel: ${message.channel}`)
      const payload = readOutboxPayload(message.payloadJson)
      const result = await sendEmail({ to: message.recipient, subject: message.subject || 'FRAD notification', html: payload.html, text: payload.text, attachments: payload.attachments?.map((item) => ({ filename: item.filename, content: Buffer.from(item.contentBase64, 'base64'), contentType: item.contentType })) })
      if (!result.success) throw new Error(result.error instanceof Error ? result.error.message : 'Delivery failed')
      const finalized = await prisma.outboxMessage.updateMany({ where: { id: message.id, status: 'PROCESSING', leaseOwner }, data: { status: 'DELIVERED', deliveredAt: new Date(), lockedAt: null, leaseOwner: null, lastError: null, payloadJson: JSON.stringify({ scrubbed: true }) } })
      if (finalized.count !== 1) throw new Error('Outbox lease was lost before delivery finalization')
      delivered++
    } catch (error) {
      const attempts = message.attempts + 1
      const dead = attempts >= message.maximumAttempts
      await prisma.outboxMessage.updateMany({ where: { id: message.id, status: 'PROCESSING', leaseOwner }, data: {
        status: dead ? 'DEAD_LETTER' : 'FAILED', lockedAt: null, leaseOwner: null,
        availableAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
        lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown delivery error',
      } })
      if (dead) deadLettered++; else failed++
      logger.error('outbox.delivery_failed', { messageId: message.id, channel: message.channel, attempts, dead })
    }
  }
  return { considered: candidates.length, delivered, failed, deadLettered }
}
