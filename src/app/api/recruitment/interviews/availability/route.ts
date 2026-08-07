import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { CALENDAR_PROVIDERS, fetchBusyWindows, type CalendarProvider } from '@/lib/calendar-providers'
import { getAccessToken } from '@/lib/calendar-identity'

/**
 * §28.15 Panel availability and slot proposal.
 *
 * Availability comes from two places: windows a person entered by hand, and
 * busy time synced from a connected calendar. Both are stored the same way, so
 * slot-finding does not care which a given panel member uses.
 */

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('DECLARE'),
    vacancyId: z.string().min(1).optional(),
    windows: z
      .array(
        z.object({
          startAt: z.coerce.date(),
          endAt: z.coerce.date(),
          busy: z.boolean().default(false),
          note: z.string().trim().max(500).optional(),
        })
      )
      .min(1)
      .max(60),
    timeZone: z.string().trim().max(64).default('Africa/Lagos'),
    replaceExisting: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('SYNC'),
    provider: z.enum(CALENDAR_PROVIDERS),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
  z.object({
    action: z.literal('PROPOSE'),
    vacancyId: z.string().min(1),
    panelUserIds: z.array(z.string().min(1)).min(1).max(12),
    from: z.coerce.date(),
    to: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
    /** Working hours in the vacancy's time zone. */
    dayStartHour: z.coerce.number().int().min(0).max(23).default(9),
    dayEndHour: z.coerce.number().int().min(1).max(24).default(17),
  }),
])

/**
 * §28.15 time-zone conversion. `Intl` gives the correct UTC offset for a zone on
 * a given date, which is what makes "09:00 in Africa/Lagos" survive a DST change
 * in a panel member's own zone.
 */
function zonedHour(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(instant)
  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
}

function zonedWeekday(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(instant)
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const url = new URL(request.url)
    const vacancyId = url.searchParams.get('vacancyId')
    const scope = url.searchParams.get('scope')

    // A panel member sees only their own declared availability; a coordinator
    // may look across the panel.
    const canCoordinate = scope === 'ALL'
    if (canCoordinate) await requirePermission('interview.manage')

    const windows = await prisma.availabilityWindow.findMany({
      where: {
        ...(canCoordinate ? {} : { userId: user.userId }),
        ...(vacancyId ? { vacancyId } : {}),
        endAt: { gte: new Date() },
      },
      orderBy: { startAt: 'asc' },
      take: 1000,
      select: {
        id: true,
        userId: true,
        applicationId: true,
        vacancyId: true,
        startAt: true,
        endAt: true,
        timeZone: true,
        source: true,
        busy: true,
        note: true,
      },
    })

    return NextResponse.json({ windows })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)

    if (input.action === 'DECLARE') {
      for (const window of input.windows)
        if (window.endAt <= window.startAt)
          throw new AuthzError('Each availability window must end after it starts', 400)

      if (input.replaceExisting)
        await prisma.availabilityWindow.deleteMany({
          where: { userId: user.userId, source: 'MANUAL', vacancyId: input.vacancyId ?? null, endAt: { gte: new Date() } },
        })

      await prisma.availabilityWindow.createMany({
        data: input.windows.map((window) => ({
          userId: user.userId,
          vacancyId: input.vacancyId ?? null,
          startAt: window.startAt,
          endAt: window.endAt,
          timeZone: input.timeZone,
          source: 'MANUAL',
          busy: window.busy,
          note: window.note?.trim() || null,
        })),
      })
      return NextResponse.json({ success: true, saved: input.windows.length })
    }

    if (input.action === 'SYNC') {
      const accessToken = await getAccessToken(user.userId, input.provider as CalendarProvider)
      if (!accessToken)
        throw new AuthzError('Connect this calendar before syncing availability', 409)
      if (input.to <= input.from) throw new AuthzError('The sync window must end after it starts', 400)

      let busy: Array<{ startAt: Date; endAt: Date }>
      try {
        busy = await fetchBusyWindows({
          provider: input.provider as CalendarProvider,
          accessToken,
          from: input.from,
          to: input.to,
        })
      } catch (error) {
        logger.error('Calendar free/busy sync failed', {
          provider: input.provider,
          error: error instanceof Error ? error.message : String(error),
        })
        throw new AuthzError('The calendar could not be read. Reconnect it and try again.', 502)
      }

      // Replace the synced range wholesale: a deleted meeting must disappear
      // from availability, which incremental merging would not achieve.
      await prisma.$transaction([
        prisma.availabilityWindow.deleteMany({
          where: { userId: user.userId, source: 'CALENDAR_SYNC', startAt: { gte: input.from }, endAt: { lte: input.to } },
        }),
        prisma.availabilityWindow.createMany({
          data: busy.map((window) => ({
            userId: user.userId,
            startAt: window.startAt,
            endAt: window.endAt,
            source: 'CALENDAR_SYNC',
            busy: true,
          })),
        }),
      ])

      await prisma.integrationIdentity.updateMany({
        where: { userId: user.userId, connection: { provider: input.provider } },
        data: { lastSyncAt: new Date() },
      })

      await logAudit({
        actorUserId: user.userId,
        action: 'CALENDAR_AVAILABILITY_SYNCED',
        resourceType: 'IntegrationIdentity',
        resourceId: `${input.provider}:${user.userId}`,
        newValue: { windows: busy.length },
      })
      return NextResponse.json({ success: true, synced: busy.length })
    }

    // PROPOSE
    await requirePermission('interview.manage')
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: input.vacancyId },
      select: { id: true, timeZone: true },
    })
    if (!vacancy) throw new AuthzError('Vacancy not found', 404)
    if (input.to <= input.from) throw new AuthzError('The search window must end after it starts', 400)
    const durationMinutes = input.durationMinutes ?? 60
    const dayStartHour = input.dayStartHour ?? 9
    const dayEndHour = input.dayEndHour ?? 17
    if (dayEndHour <= dayStartHour)
      throw new AuthzError('Working hours must end after they start', 400)

    const busyWindows = await prisma.availabilityWindow.findMany({
      where: {
        userId: { in: input.panelUserIds },
        busy: true,
        startAt: { lt: input.to },
        endAt: { gt: input.from },
      },
      select: { userId: true, startAt: true, endAt: true },
    })

    const freeWindows = await prisma.availabilityWindow.findMany({
      where: {
        userId: { in: input.panelUserIds },
        busy: false,
        startAt: { lt: input.to },
        endAt: { gt: input.from },
      },
      select: { userId: true, startAt: true, endAt: true },
    })
    const declaredBy = new Set(freeWindows.map((window) => window.userId))

    const durationMs = durationMinutes * 60_000
    const step = 30 * 60_000
    const slots: Array<{ startAt: Date; endAt: Date; availableUserIds: string[] }> = []

    for (let cursor = input.from.getTime(); cursor + durationMs <= input.to.getTime(); cursor += step) {
      const start = new Date(cursor)
      const end = new Date(cursor + durationMs)

      // Keep proposals inside working hours in the vacancy's own time zone.
      const startHour = zonedHour(start, vacancy.timeZone)
      const endHour = zonedHour(new Date(end.getTime() - 1), vacancy.timeZone)
      if (startHour < dayStartHour || endHour >= dayEndHour) continue
      const weekday = zonedWeekday(start, vacancy.timeZone)
      if (weekday === 'Sat' || weekday === 'Sun') continue

      const availableUserIds = input.panelUserIds.filter((userId) => {
        const clash = busyWindows.some(
          (window) => window.userId === userId && window.startAt < end && window.endAt > start
        )
        if (clash) return false
        // Someone who declared explicit free windows is only available inside
        // them; someone who declared nothing is treated as open.
        if (!declaredBy.has(userId)) return true
        return freeWindows.some(
          (window) => window.userId === userId && window.startAt <= start && window.endAt >= end
        )
      })

      if (availableUserIds.length) slots.push({ startAt: start, endAt: end, availableUserIds })
    }

    // Fullest panel first, then earliest.
    slots.sort(
      (a, b) => b.availableUserIds.length - a.availableUserIds.length || a.startAt.getTime() - b.startAt.getTime()
    )

    return NextResponse.json({
      timeZone: vacancy.timeZone,
      panelSize: input.panelUserIds.length,
      slots: slots.slice(0, 40).map((slot) => ({
        startAt: slot.startAt,
        endAt: slot.endAt,
        availableUserIds: slot.availableUserIds,
        unavailableUserIds: input.panelUserIds.filter((id) => !slot.availableUserIds.includes(id)),
        complete: slot.availableUserIds.length === input.panelUserIds.length,
      })),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
