import { createHash } from 'crypto'
import { prisma } from './prisma'

async function settingDays(key: string, fallback: number) {
  const setting = await prisma.systemSetting.findUnique({ where: { key } })
  const value = Number(setting?.valueJson)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export async function runRetentionPolicy(now = new Date()) {
  const policyVersion = '2026-07-v1'
  const run = await prisma.retentionRun.create({ data: { policyVersion } })
  try {
    const [draftDays, notificationDays, referenceDays, outboxDays] = await Promise.all([
      settingDays('RETENTION_UNSUBMITTED_DRAFT_DAYS', 90),
      settingDays('RETENTION_NOTIFICATION_DAYS', 90),
      settingDays('RETENTION_EXPIRED_REFERENCE_DAYS', 365),
      settingDays('RETENTION_DELIVERED_OUTBOX_DAYS', 30),
    ])
    const activeHolds = await prisma.legalHold.findMany({ where: { status: 'ACTIVE' }, select: { resourceType: true, resourceId: true } })
    const held = (type: string) => activeHolds.filter((hold) => hold.resourceType === type).map((hold) => hold.resourceId)
    const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000)

    const drafts = await prisma.application.findMany({ where: { internalStatus: 'DRAFT', updatedAt: { lt: cutoff(draftDays) }, id: { notIn: held('APPLICATION') } }, select: { id: true } })
    const deletedDrafts = drafts.length ? await prisma.application.deleteMany({ where: { id: { in: drafts.map((item) => item.id) } } }) : { count: 0 }
    const deletedNotifications = await prisma.notification.deleteMany({ where: { status: 'READ', sentAt: { lt: cutoff(notificationDays) }, userId: { notIn: held('USER') } } })
    const deletedReferences = await prisma.referenceRequest.deleteMany({ where: { status: 'EXPIRED', expiresAt: { lt: cutoff(referenceDays) }, id: { notIn: held('REFERENCE_REQUEST') } } })
    const deletedOutbox = await prisma.outboxMessage.deleteMany({ where: { status: 'DELIVERED', deliveredAt: { lt: cutoff(outboxDays) }, id: { notIn: held('OUTBOX_MESSAGE') } } })
    const deletedIdempotency = await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: now }, id: { notIn: held('IDEMPOTENCY_RECORD') } } })
    const deletedRateLimitBuckets = await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now }, keyHash: { notIn: held('RATE_LIMIT_BUCKET') } } })

    const summary = {
      policyVersion, legalHoldsHonoured: activeHolds.length,
      deletedDrafts: deletedDrafts.count, deletedNotifications: deletedNotifications.count,
      deletedReferenceRequests: deletedReferences.count, deletedOutboxMessages: deletedOutbox.count,
      deletedIdempotencyRecords: deletedIdempotency.count,
      deletedRateLimitBuckets: deletedRateLimitBuckets.count,
    }
    const evidenceHash = createHash('sha256').update(JSON.stringify(summary)).digest('hex')
    await prisma.retentionRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', completedAt: new Date(), summaryJson: JSON.stringify(summary), evidenceHash } })
    return { runId: run.id, ...summary, evidenceHash }
  } catch (error) {
    await prisma.retentionRun.update({ where: { id: run.id }, data: { status: 'FAILED', completedAt: new Date(), error: error instanceof Error ? error.message : 'Unknown retention error' } })
    throw error
  }
}
