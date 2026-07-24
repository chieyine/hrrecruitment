import { createHash } from 'crypto'
import { prisma } from './prisma'
import { AuthzError } from './errors'

export type IdempotencyClaim = { replay: false; id: string } | { replay: true; statusCode: number; body: unknown }

export function requestDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export async function claimIdempotency(input: { request: Request; scope: string; actorUserId?: string | null; payload: unknown; ttlHours?: number }): Promise<IdempotencyClaim | null> {
  const key = input.request.headers.get('idempotency-key')?.trim()
  if (!key) return null
  if (key.length < 8 || key.length > 200) throw new AuthzError('Idempotency-Key must contain 8 to 200 characters', 400)
  const actorUserId = input.actorUserId || null
  const requestHash = requestDigest(input.payload)
  const existing = await prisma.idempotencyRecord.findFirst({ where: { scope: input.scope, key, actorUserId } })
  if (existing) {
    if (existing.requestHash !== requestHash) throw new AuthzError('Idempotency-Key was already used with a different request', 409)
    if (existing.responseJson && existing.statusCode) return { replay: true, statusCode: existing.statusCode, body: JSON.parse(existing.responseJson) }
    throw new AuthzError('An identical request is already being processed', 409)
  }
  const record = await prisma.idempotencyRecord.create({ data: {
    scope: input.scope, key, actorUserId, requestHash,
    expiresAt: new Date(Date.now() + (input.ttlHours || 24) * 3_600_000),
  } })
  return { replay: false, id: record.id }
}

export async function completeIdempotency(claim: IdempotencyClaim | null, statusCode: number, body: unknown) {
  if (claim && !claim.replay) await prisma.idempotencyRecord.update({ where: { id: claim.id }, data: { statusCode, responseJson: JSON.stringify(body) } })
}

export async function abandonIdempotency(claim: IdempotencyClaim | null) {
  if (claim && !claim.replay) await prisma.idempotencyRecord.delete({ where: { id: claim.id } }).catch(() => undefined)
}
