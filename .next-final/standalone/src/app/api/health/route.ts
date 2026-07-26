import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const started = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const expected = process.env.HEALTH_SECRET
    const supplied = request.headers.get('x-health-secret') || ''
    const detailed = Boolean(expected && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
    if (!detailed) return Response.json({ status: 'ok', database: 'reachable', latencyMs: Date.now()-started })
    const [lastJob, pendingOutbox, deadLetters, unresolvedCritical] = await Promise.all([
      prisma.jobRun.findFirst({ orderBy: { startedAt: 'desc' } }),
      prisma.outboxMessage.count({ where: { status: { in: ['PENDING','FAILED','PROCESSING'] } } }),
      prisma.outboxMessage.count({ where: { status: 'DEAD_LETTER' } }),
      prisma.operationalEvent.count({ where: { resolvedAt: null, severity: 'CRITICAL' } }),
    ])
    // A fresh deployment has no job runs yet; that is "starting", not
    // "degraded". Only a job that has run and then gone quiet is a problem.
    const staleAfterMs = Number(process.env.HEALTH_JOB_STALE_MINUTES || 60) * 60_000
    const jobState = !lastJob
      ? 'never_run'
      : Date.now() - lastJob.startedAt.getTime() > staleAfterMs
        ? 'stale'
        : 'healthy'
    const degraded = deadLetters > 0 || unresolvedCritical > 0 || jobState === 'stale'
    return Response.json({ status: degraded?'degraded':'ok', database:'reachable', latencyMs:Date.now()-started, jobState, lastJob, pendingOutbox, deadLetters, unresolvedCritical }, { status: degraded?503:200 })
  } catch {
    return Response.json({ status:'unavailable', database:'unreachable' }, { status:503 })
  }
}
