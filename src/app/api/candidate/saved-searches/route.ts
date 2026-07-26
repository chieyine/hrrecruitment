import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

/**
 * Candidate saved searches, optionally emailed when a new matching vacancy opens.
 *
 * `TalentPool` already existed but is a recruiter-side pull: a candidate had no
 * way to be told about a role that matched their interests. The alert job lives
 * in lib/background-jobs.
 */

const MAX_PER_USER = 10

const criteriaSchema = z.object({
  search: z.string().trim().max(100).optional(),
  departmentId: z.string().max(100).optional(),
  dutyStationId: z.string().max(100).optional(),
  contractType: z.string().max(60).optional(),
})

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  criteria: criteriaSchema,
  alertsEnabled: z.boolean().default(true),
  frequency: z.enum(['DAILY', 'WEEKLY']).default('DAILY'),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  criteria: criteriaSchema.optional(),
  alertsEnabled: z.boolean().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']).optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const searches = await prisma.savedSearch.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_PER_USER,
    })
    return NextResponse.json({
      savedSearches: searches.map((search) => ({
        id: search.id,
        name: search.name,
        criteria: JSON.parse(search.criteriaJson),
        alertsEnabled: search.alertsEnabled,
        frequency: search.frequency,
        lastAlertAt: search.lastAlertAt,
        createdAt: search.createdAt,
      })),
      maximum: MAX_PER_USER,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, createSchema)

    // At least one criterion, or the alert matches every vacancy we ever open.
    const criteria = input.criteria
    if (!criteria.search && !criteria.departmentId && !criteria.dutyStationId && !criteria.contractType) {
      throw new AuthzError('Add at least one filter before saving a search', 400)
    }

    const existing = await prisma.savedSearch.count({ where: { userId: user.userId } })
    if (existing >= MAX_PER_USER) {
      throw new AuthzError(`You can save up to ${MAX_PER_USER} searches. Delete one first.`, 409)
    }

    const saved = await prisma.savedSearch.create({
      data: {
        userId: user.userId,
        name: input.name,
        criteriaJson: JSON.stringify(criteria),
        alertsEnabled: input.alertsEnabled,
        frequency: input.frequency,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'SAVED_SEARCH_CREATED',
      resourceType: 'SavedSearch',
      resourceId: saved.id,
    })
    return NextResponse.json({ success: true, id: saved.id })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, updateSchema)

    // Scope the update by userId so an id from another account cannot be edited.
    const updated = await prisma.savedSearch.updateMany({
      where: { id: input.id, userId: user.userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.criteria !== undefined ? { criteriaJson: JSON.stringify(input.criteria) } : {}),
        ...(input.alertsEnabled !== undefined ? { alertsEnabled: input.alertsEnabled } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      },
    })
    if (updated.count !== 1) throw new AuthzError('Saved search not found', 404)
    return NextResponse.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const { id } = await parseBody(request, z.object({ id: z.string().uuid() }))
    const removed = await prisma.savedSearch.deleteMany({ where: { id, userId: user.userId } })
    if (removed.count !== 1) throw new AuthzError('Saved search not found', 404)
    return NextResponse.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
