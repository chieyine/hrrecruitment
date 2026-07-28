import { createHash } from 'crypto'
import { prisma } from './prisma'

async function settingDays(key: string, fallback: number) {
  const setting = await prisma.systemSetting.findUnique({ where: { key } })
  const value = Number(setting?.valueJson)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const sorted = (values: string[]) => [...values].sort()

/**
 * Apply the approved short-lived-record policy as one serializable database
 * transaction. Candidate rows are resolved before deletion so a hold on a
 * parent application, candidate, or user also protects its descendants.
 */
export async function runRetentionPolicy(now = new Date()) {
  const policyVersion = '2026-07-v2'
  const run = await prisma.retentionRun.create({ data: { policyVersion } })
  try {
    const [draftDays, notificationDays, referenceDays, outboxDays] = await Promise.all([
      settingDays('RETENTION_UNSUBMITTED_DRAFT_DAYS', 90),
      settingDays('RETENTION_NOTIFICATION_DAYS', 90),
      settingDays('RETENTION_EXPIRED_REFERENCE_DAYS', 365),
      settingDays('RETENTION_DELIVERED_OUTBOX_DAYS', 30),
    ])
    const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000)
    const cutoffs = {
      drafts: cutoff(draftDays),
      notifications: cutoff(notificationDays),
      references: cutoff(referenceDays),
      outbox: cutoff(outboxDays),
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const activeHolds = await tx.legalHold.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, resourceType: true, resourceId: true },
          orderBy: { id: 'asc' },
        })
        const held = new Set(activeHolds.map((hold) => `${hold.resourceType}:${hold.resourceId}`))
        const isHeld = (...resources: Array<[string, string | null | undefined]>) =>
          resources.some(([type, id]) => Boolean(id && held.has(`${type}:${id}`)))

        const draftCandidates = await tx.application.findMany({
          where: { internalStatus: 'DRAFT', updatedAt: { lt: cutoffs.drafts } },
          select: { id: true, candidateId: true, candidate: { select: { userId: true } } },
        })
        const draftIds = draftCandidates
          .filter(
            (item) =>
              !isHeld(['APPLICATION', item.id], ['CANDIDATE', item.candidateId], ['USER', item.candidate.userId])
          )
          .map((item) => item.id)

        const notificationCandidates = await tx.notification.findMany({
          where: { status: 'READ', sentAt: { lt: cutoffs.notifications } },
          select: { id: true, userId: true },
        })
        const notificationIds = notificationCandidates
          .filter((item) => !isHeld(['NOTIFICATION', item.id], ['USER', item.userId]))
          .map((item) => item.id)

        const referenceCandidates = await tx.referenceRequest.findMany({
          where: { status: 'EXPIRED', expiresAt: { lt: cutoffs.references } },
          select: {
            id: true,
            refereeId: true,
            referee: {
              select: {
                applicationId: true,
                application: { select: { candidateId: true, candidate: { select: { userId: true } } } },
              },
            },
          },
        })
        const referenceIds = referenceCandidates
          .filter(
            (item) =>
              !isHeld(
                ['REFERENCE_REQUEST', item.id],
                ['REFEREE', item.refereeId],
                ['APPLICATION', item.referee.applicationId],
                ['CANDIDATE', item.referee.application.candidateId],
                ['USER', item.referee.application.candidate.userId]
              )
          )
          .map((item) => item.id)

        const outboxCandidates = await tx.outboxMessage.findMany({
          where: { status: 'DELIVERED', deliveredAt: { lt: cutoffs.outbox } },
          select: { id: true, applicationId: true },
        })
        const outboxApplicationIds = [
          ...new Set(outboxCandidates.map((item) => item.applicationId).filter((id): id is string => Boolean(id))),
        ]
        const outboxApplications = outboxApplicationIds.length
          ? await tx.application.findMany({
              where: { id: { in: outboxApplicationIds } },
              select: { id: true, candidateId: true, candidate: { select: { userId: true } } },
            })
          : []
        const outboxParents = new Map(outboxApplications.map((item) => [item.id, item]))
        const outboxIds = outboxCandidates
          .filter((item) => {
            const parent = item.applicationId ? outboxParents.get(item.applicationId) : undefined
            return !isHeld(
              ['OUTBOX_MESSAGE', item.id],
              ['APPLICATION', item.applicationId],
              ['CANDIDATE', parent?.candidateId],
              ['USER', parent?.candidate.userId]
            )
          })
          .map((item) => item.id)

        const idempotencyCandidates = await tx.idempotencyRecord.findMany({
          where: { expiresAt: { lt: now } },
          select: { id: true, actorUserId: true },
        })
        const idempotencyIds = idempotencyCandidates
          .filter((item) => !isHeld(['IDEMPOTENCY_RECORD', item.id], ['USER', item.actorUserId]))
          .map((item) => item.id)

        const rateLimitCandidates = await tx.rateLimitBucket.findMany({
          where: { expiresAt: { lt: now } },
          select: { keyHash: true },
        })
        const rateLimitKeys = rateLimitCandidates
          .filter((item) => !isHeld(['RATE_LIMIT_BUCKET', item.keyHash]))
          .map((item) => item.keyHash)

        const [
          deletedDrafts,
          deletedNotifications,
          deletedReferences,
          deletedOutbox,
          deletedIdempotency,
          deletedRateLimitBuckets,
        ] = await Promise.all([
          draftIds.length ? tx.application.deleteMany({ where: { id: { in: draftIds } } }) : { count: 0 },
          notificationIds.length
            ? tx.notification.deleteMany({ where: { id: { in: notificationIds } } })
            : { count: 0 },
          referenceIds.length ? tx.referenceRequest.deleteMany({ where: { id: { in: referenceIds } } }) : { count: 0 },
          outboxIds.length ? tx.outboxMessage.deleteMany({ where: { id: { in: outboxIds } } }) : { count: 0 },
          idempotencyIds.length
            ? tx.idempotencyRecord.deleteMany({ where: { id: { in: idempotencyIds } } })
            : { count: 0 },
          rateLimitKeys.length
            ? tx.rateLimitBucket.deleteMany({ where: { keyHash: { in: rateLimitKeys } } })
            : { count: 0 },
        ])

        const evidence = {
          policyVersion,
          evaluatedAt: now.toISOString(),
          settings: { draftDays, notificationDays, referenceDays, outboxDays },
          cutoffs: Object.fromEntries(Object.entries(cutoffs).map(([key, value]) => [key, value.toISOString()])),
          activeHolds: activeHolds.map((hold) => ({
            id: hold.id,
            resourceType: hold.resourceType,
            resourceId: hold.resourceId,
          })),
          deletionManifest: {
            applications: sorted(draftIds),
            notifications: sorted(notificationIds),
            referenceRequests: sorted(referenceIds),
            outboxMessages: sorted(outboxIds),
            idempotencyRecords: sorted(idempotencyIds),
            rateLimitBuckets: sorted(rateLimitKeys),
          },
          counts: {
            deletedDrafts: deletedDrafts.count,
            deletedNotifications: deletedNotifications.count,
            deletedReferenceRequests: deletedReferences.count,
            deletedOutboxMessages: deletedOutbox.count,
            deletedIdempotencyRecords: deletedIdempotency.count,
            deletedRateLimitBuckets: deletedRateLimitBuckets.count,
          },
        }
        const evidenceHash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
        const summary = {
          ...evidence.counts,
          policyVersion,
          legalHoldsHonoured: activeHolds.length,
          evidence,
        }
        await tx.retentionRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            summaryJson: JSON.stringify(summary),
            evidenceHash,
          },
        })
        return { summary, evidenceHash }
      },
      { isolationLevel: 'Serializable' }
    )

    return { runId: run.id, ...result.summary, evidenceHash: result.evidenceHash }
  } catch (error) {
    await prisma.retentionRun
      .update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown retention error',
        },
      })
      .catch(() => undefined)
    throw error
  }
}
