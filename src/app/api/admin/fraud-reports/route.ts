import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

/**
 * Reading and triaging public fraud reports.
 *
 * The public form has always created these, and admins have always been
 * notified about them, but nothing ever read them back — the reports
 * accumulated unread and the notification named an id nobody could open.
 *
 * Restricted to HR_MANAGER and SYSTEM_ADMIN: reports name third parties and
 * often contain a reporter's contact details.
 */

const STATUSES = ['RECEIVED', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED'] as const
const PAGE_SIZE = 50

export async function GET(request: Request) {
  try {
    await requireRole('HR_MANAGER')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new AuthzError('Unknown status filter', 400)
    }
    const page = Math.max(1, Number(searchParams.get('page')) || 1)

    const where = status ? { status } : {}
    const [reports, total, counts] = await Promise.all([
      prisma.fraudReport.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.fraudReport.count({ where }),
      prisma.fraudReport.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    // Attribute triage decisions to a person rather than a bare id.
    const triagerIds = [...new Set(reports.map((report) => report.triagedBy).filter(Boolean))] as string[]
    const triagers = triagerIds.length
      ? await prisma.user.findMany({ where: { id: { in: triagerIds } }, select: { id: true, email: true } })
      : []
    const emailById = new Map(triagers.map((user) => [user.id, user.email]))

    return NextResponse.json({
      reports: reports.map((report) => ({ ...report, triagedByEmail: report.triagedBy ? emailById.get(report.triagedBy) ?? null : null })),
      page,
      pageSize: PAGE_SIZE,
      total,
      hasMore: page * PAGE_SIZE < total,
      countsByStatus: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
  triageNote: z.string().trim().max(4000).optional(),
})

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER')
    const input = await parseBody(request, patchSchema)

    const existing = await prisma.fraudReport.findUnique({ where: { id: input.id } })
    if (!existing) throw new AuthzError('Fraud report not found', 404)

    // Closing a report has to say why: this is the accountability record for a
    // confidential channel.
    if ((input.status === 'ACTIONED' || input.status === 'DISMISSED') && !input.triageNote) {
      throw new AuthzError('Record what was decided before closing a report', 400)
    }

    const updated = await prisma.fraudReport.update({
      where: { id: input.id },
      data: {
        status: input.status,
        triageNote: input.triageNote ?? existing.triageNote,
        triagedBy: user.userId,
        triagedAt: new Date(),
      },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'FRAUD_REPORT_TRIAGED',
      resourceType: 'FraudReport',
      resourceId: updated.id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status },
      reason: input.triageNote,
    })

    return NextResponse.json({ success: true, report: updated })
  } catch (error) {
    return authzResponse(error)
  }
}
