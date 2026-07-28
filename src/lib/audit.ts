import { prisma } from './prisma'
import { createHash } from 'crypto'
import { logger } from './logger'

export interface LogAuditParams {
  actorUserId?: string | null
  action: string
  resourceType: string
  resourceId: string
  previousValue?: any
  newValue?: any
  reason?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
}

export async function logAudit(params: LogAuditParams) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        let head = await tx.auditChainHead.findUnique({ where: { id: 'GLOBAL' } })
        if (!head) {
          const previous = await tx.auditLog.findFirst({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { entryHash: true },
          })
          head = await tx.auditChainHead.create({ data: { id: 'GLOBAL', headHash: previous?.entryHash || null } })
        }
        const previousHash = head.headHash
        const createdAt = new Date()
        const payload = {
          actorUserId: params.actorUserId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          previousValueJson: params.previousValue ? JSON.stringify(params.previousValue) : null,
          newValueJson: params.newValue ? JSON.stringify(params.newValue) : null,
          reason: params.reason || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          requestId: params.requestId || null,
          createdAt: createdAt.toISOString(),
          previousHash,
        }
        const entryHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
        await tx.auditLog.create({ data: { ...payload, createdAt, entryHash } })
        const advanced = await tx.auditChainHead.updateMany({
          where: { id: head.id, version: head.version, headHash: previousHash },
          data: { headHash: entryHash, version: { increment: 1 } },
        })
        if (advanced.count !== 1) throw new Error('AUDIT_HEAD_CONFLICT')
      })
      return
    } catch (err) {
      const retryable =
        err instanceof Error &&
        (err.message.includes('AUDIT_HEAD_CONFLICT') || err.message.includes('Unique constraint'))
      if (retryable && attempt < 4) continue
      logger.error('Failed to write audit log entry', {
        action: params.action,
        error: err instanceof Error ? err.message : String(err),
      })
      await prisma.operationalEvent
        .create({
          data: {
            eventType: 'AUDIT_WRITE_FAILED',
            severity: 'CRITICAL',
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            detailsJson: JSON.stringify({ action: params.action }),
          },
        })
        .catch(() => undefined)
      return
    }
  }
}

/**
 * Verify the tamper-evident audit chain.
 *
 * The whole chain has to be walked, but loading it in one unbounded findMany
 * put the entire table in memory. Entries are streamed in pages instead, and
 * `maxEntries` gives callers a hard ceiling.
 */
export async function verifyAuditChain({ pageSize = 5_000, maxEntries = 500_000 } = {}) {
  const entries: Array<{
    id: string
    actorUserId: string | null
    action: string
    resourceType: string
    resourceId: string
    previousValueJson: string | null
    newValueJson: string | null
    reason: string | null
    ipAddress: string | null
    userAgent: string | null
    requestId: string | null
    createdAt: Date
    previousHash: string | null
    entryHash: string | null
  }> = []
  let pageCursor: string | undefined
  const select = {
    id: true,
    actorUserId: true,
    action: true,
    resourceType: true,
    resourceId: true,
    previousValueJson: true,
    newValueJson: true,
    reason: true,
    ipAddress: true,
    userAgent: true,
    requestId: true,
    createdAt: true,
    previousHash: true,
    entryHash: true,
  } as const
  for (;;) {
    const page = await prisma.auditLog.findMany({
      select,
      orderBy: { id: 'asc' },
      take: pageSize,
      ...(pageCursor ? { skip: 1, cursor: { id: pageCursor } } : {}),
    })
    entries.push(...page)
    if (page.length < pageSize) break
    if (entries.length >= maxEntries) {
      return { valid: false, checked: entries.length, reason: 'CHAIN_TOO_LARGE_TO_VERIFY' }
    }
    pageCursor = page[page.length - 1].id
  }
  const hashed = entries.filter((entry) => entry.entryHash)
  for (const entry of hashed) {
    const payload = {
      actorUserId: entry.actorUserId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      previousValueJson: entry.previousValueJson,
      newValueJson: entry.newValueJson,
      reason: entry.reason,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestId: entry.requestId,
      createdAt: entry.createdAt.toISOString(),
      previousHash: entry.previousHash,
    }
    const expected = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    if (entry.entryHash !== expected)
      return { valid: false, checked: hashed.length, invalidEntryId: entry.id, reason: 'HASH_MISMATCH' }
  }
  if (!hashed.length) return { valid: true, checked: 0, headHash: null }
  const byHash = new Map(hashed.map((entry) => [entry.entryHash!, entry]))
  const referenced = new Set(hashed.map((entry) => entry.previousHash).filter(Boolean))
  const heads = hashed.filter((entry) => !referenced.has(entry.entryHash))
  if (heads.length !== 1) return { valid: false, checked: hashed.length, reason: 'CHAIN_BRANCH_OR_MISSING_HEAD' }
  let node = heads[0]
  let traversed = 0
  const seen = new Set<string>()
  while (node) {
    if (seen.has(node.entryHash!)) return { valid: false, checked: hashed.length, reason: 'CHAIN_CYCLE' }
    seen.add(node.entryHash!)
    traversed++
    if (!node.previousHash) break
    const prior = byHash.get(node.previousHash)
    if (!prior)
      return { valid: false, checked: hashed.length, invalidEntryId: node.id, reason: 'MISSING_PREVIOUS_ENTRY' }
    node = prior
  }
  if (traversed !== hashed.length) return { valid: false, checked: hashed.length, reason: 'DISCONNECTED_CHAIN' }
  const persistedHead = await prisma.auditChainHead.findUnique({ where: { id: 'GLOBAL' } })
  if (persistedHead && persistedHead.headHash !== heads[0].entryHash)
    return { valid: false, checked: hashed.length, reason: 'HEAD_POINTER_MISMATCH' }
  return {
    valid: true,
    checked: hashed.length,
    legacyEntries: entries.length - hashed.length,
    headHash: heads[0].entryHash,
  }
}
