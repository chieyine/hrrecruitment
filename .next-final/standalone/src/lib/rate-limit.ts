/**
 * Minimal in-memory sliding-window rate limiter. Suitable for a single-instance
 * deployment; swap the Map for Redis (or an edge KV) when running multiple
 * instances. Keyed by an arbitrary identifier (e.g. `${route}:${ip}`).
 */

interface Bucket {
  hits: number[]
}

import { createHash } from 'crypto'
import { prisma } from './prisma'

const store = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key) ?? { hits: [] }
  // Drop timestamps outside the window.
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
    store.set(key, bucket)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  bucket.hits.push(now)
  store.set(key, bucket)
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 }
}

/** Database-backed fixed-window limiter shared by every application instance. */
export async function rateLimitDistributed(key: string, limit = 10, windowMs = 60_000): Promise<RateLimitResult> {
  const now = new Date()
  const keyHash = createHash('sha256').update(key).digest('hex')
  const expiresAt = new Date(now.getTime() + windowMs)
  const reset = await prisma.rateLimitBucket.updateMany({ where: { keyHash, expiresAt: { lte: now } }, data: { count: 1, windowStart: now, expiresAt } })
  if (reset.count === 0) {
    const incremented = await prisma.rateLimitBucket.updateMany({ where: { keyHash, expiresAt: { gt: now } }, data: { count: { increment: 1 } } })
    if (incremented.count === 0) {
      try { await prisma.rateLimitBucket.create({ data: { keyHash, count: 1, windowStart: now, expiresAt } }) }
      catch { // A concurrent creator won the unique key; increment its live bucket.
        await prisma.rateLimitBucket.updateMany({ where: { keyHash, expiresAt: { gt: now } }, data: { count: { increment: 1 } } })
      }
    }
  }
  const bucket = await prisma.rateLimitBucket.findUniqueOrThrow({ where: { keyHash } })
  if (bucket.count > limit) return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1,Math.ceil((bucket.expiresAt.getTime()-now.getTime())/1000)) }
  return { allowed: true, remaining: Math.max(0,limit-bucket.count), retryAfterSeconds: 0 }
}

/** Client IP accepted only from the explicitly configured trusted proxy header. */
export function clientIp(request: Request): string {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase()
  if (!header) return 'unknown'
  const value = request.headers.get(header)
  if (!value) return 'unknown'
  return value.split(',')[0].trim().slice(0, 128) || 'unknown'
}

/** Periodically clear empty buckets to bound memory. */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of store) {
      bucket.hits = bucket.hits.filter((t) => now - t < 300_000)
      if (bucket.hits.length === 0) store.delete(key)
    }
  }, 300_000).unref?.()
}
