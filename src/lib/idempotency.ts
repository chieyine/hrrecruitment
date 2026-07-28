import { createHash } from 'crypto'
import { prisma } from './prisma'
import { AuthzError } from './errors'

/** Stand-in actor for unauthenticated claims; see claimIdempotency. */
const ANONYMOUS_ACTOR = '__anonymous__'

export type IdempotencyClaim = { replay: false; id: string } | { replay: true; statusCode: number; body: unknown }

export function requestDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export async function claimIdempotency(input: {
  request: Request
  scope: string
  actorUserId?: string | null
  payload: unknown
  ttlHours?: number
}): Promise<IdempotencyClaim | null> {
  const key = input.request.headers.get('idempotency-key')?.trim()
  if (!key) return null
  if (key.length < 8 || key.length > 200) throw new AuthzError('Idempotency-Key must contain 8 to 200 characters', 400)
  // `actorUserId` participates in the unique index, but PostgreSQL does not
  // treat NULLs as equal, so an anonymous claim could never be deduplicated.
  // A sentinel keeps every claim inside one enforceable unique key.
  const actorUserId = input.actorUserId || ANONYMOUS_ACTOR
  const requestHash = requestDigest(input.payload)
  const ttlHours = input.ttlHours ?? 24
  if (!Number.isFinite(ttlHours) || ttlHours <= 0)
    throw new AuthzError('Idempotency TTL must be greater than zero', 500)

  const replayOf = (existing: {
    requestHash: string
    responseJson: string | null
    statusCode: number | null
  }): IdempotencyClaim => {
    if (existing.requestHash !== requestHash)
      throw new AuthzError('Idempotency-Key was already used with a different request', 409)
    if (existing.responseJson !== null && existing.statusCode !== null)
      return { replay: true, statusCode: existing.statusCode, body: JSON.parse(existing.responseJson) }
    throw new AuthzError('An identical request is already being processed', 409)
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date()
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { scope_key_actorUserId: { scope: input.scope, key, actorUserId } },
    })
    if (existing && existing.expiresAt > now) return replayOf(existing)
    if (existing) {
      // Expiry makes a key reusable. Delete conditionally so two callers
      // cannot both remove a fresh replacement created by the other.
      await prisma.idempotencyRecord.deleteMany({
        where: { id: existing.id, expiresAt: { lte: now } },
      })
    }

    try {
      const record = await prisma.idempotencyRecord.create({
        data: {
          scope: input.scope,
          key,
          actorUserId,
          requestHash,
          expiresAt: new Date(now.getTime() + ttlHours * 3_600_000),
        },
      })
      return { replay: false, id: record.id }
    } catch (error) {
      // Two concurrent requests may both see no active record. The loser loops
      // and replays the winner instead of leaking a unique-constraint 500.
      if ((error as { code?: string } | null)?.code !== 'P2002') throw error
    }
  }
  throw new AuthzError('An identical request is already being processed', 409)
}

export async function completeIdempotency(claim: IdempotencyClaim | null, statusCode: number, body: unknown) {
  if (claim && !claim.replay)
    await prisma.idempotencyRecord.update({
      where: { id: claim.id },
      data: { statusCode, responseJson: JSON.stringify(body) },
    })
}

export async function abandonIdempotency(claim: IdempotencyClaim | null) {
  if (claim && !claim.replay) await prisma.idempotencyRecord.delete({ where: { id: claim.id } }).catch(() => undefined)
}
