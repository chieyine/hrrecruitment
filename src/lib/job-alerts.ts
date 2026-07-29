import { prisma } from './prisma'
import { enqueueEmail } from './outbox'
import { logger } from './logger'

/**
 * Emails candidates when a vacancy matching one of their saved searches opens.
 *
 * Run from processBackgroundSchedules. Each saved search only ever reports
 * vacancies that opened since it last ran, so a candidate is never told twice
 * about the same role.
 */

interface Criteria {
  search?: string
  departmentId?: string
  categoryId?: string
  dutyStationId?: string
  contractType?: string
}

const FREQUENCY_HOURS: Record<string, number> = { DAILY: 24, WEEKLY: 168 }
/** Cap per email so one alert cannot become an unbounded message. */
const MAX_MATCHES = 10

function escapeHtml(value: string): string {
  return value.replace(/[<>&"]/g, (character) =>
    character === '<' ? '&lt;' : character === '>' ? '&gt;' : character === '&' ? '&amp;' : '&quot;'
  )
}

export async function sendJobAlerts(now = new Date()) {
  const appUrl = process.env.APP_URL
  if (!appUrl) {
    logger.warn('Job alerts skipped: APP_URL is not configured')
    return { considered: 0, sent: 0, matched: 0 }
  }

  const due = await prisma.savedSearch.findMany({
    where: { alertsEnabled: true },
    include: { user: { select: { id: true, email: true, accountStatus: true, emailVerifiedAt: true } } },
    orderBy: { lastRunAt: 'asc' },
    take: 200,
  })

  let sent = 0
  let matched = 0

  for (const savedSearch of due) {
    // Never email a suspended account or an unverified address.
    if (savedSearch.user.accountStatus !== 'ACTIVE' || !savedSearch.user.emailVerifiedAt) continue

    const intervalHours = FREQUENCY_HOURS[savedSearch.frequency] ?? 24
    if (savedSearch.lastRunAt && now.getTime() - savedSearch.lastRunAt.getTime() < intervalHours * 3_600_000) continue

    let criteria: Criteria
    try {
      criteria = JSON.parse(savedSearch.criteriaJson) as Criteria
    } catch {
      logger.warn('Saved search has unreadable criteria', { savedSearchId: savedSearch.id })
      await prisma.savedSearch.update({ where: { id: savedSearch.id }, data: { lastRunAt: now, alertsEnabled: false } })
      continue
    }

    // Only vacancies that became visible since the last run.
    const since = savedSearch.lastAlertAt ?? savedSearch.lastRunAt ?? savedSearch.createdAt

    const vacancies = await prisma.vacancy.findMany({
      where: {
        status: 'OPEN',
        openingAt: { lte: now, gte: since },
        closingAt: { gte: now },
        ...(criteria.departmentId ? { departmentId: criteria.departmentId } : {}),
        ...(criteria.categoryId ? { categoryId: criteria.categoryId } : {}),
        ...(criteria.dutyStationId ? { dutyStationId: criteria.dutyStationId } : {}),
        ...(criteria.contractType ? { contractType: criteria.contractType } : {}),
        ...(criteria.search
          ? {
              OR: [
                { title: { contains: criteria.search, mode: 'insensitive' as const } },
                { summary: { contains: criteria.search, mode: 'insensitive' as const } },
                { referenceNumber: { contains: criteria.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, referenceNumber: true, title: true, closingAt: true },
      orderBy: { closingAt: 'asc' },
      take: MAX_MATCHES,
    })

    if (vacancies.length === 0) {
      await prisma.savedSearch.update({ where: { id: savedSearch.id }, data: { lastRunAt: now } })
      continue
    }

    matched += vacancies.length
    const rows = vacancies
      .map(
        (vacancy) =>
          `<li><a href="${appUrl}/careers/${encodeURIComponent(vacancy.referenceNumber)}">${escapeHtml(vacancy.title)}</a>` +
          ` (${escapeHtml(vacancy.referenceNumber)}) — closes ${vacancy.closingAt.toISOString().slice(0, 10)}</li>`
      )
      .join('')

    await enqueueEmail({
      recipient: savedSearch.user.email,
      subject: `New FRAD vacancies matching "${savedSearch.name}"`,
      html:
        `<p>New vacancies have opened that match your saved search <strong>${escapeHtml(savedSearch.name)}</strong>.</p>` +
        `<ul>${rows}</ul>` +
        `<p>Manage or turn off these alerts in your <a href="${appUrl}/candidate/settings">account settings</a>.</p>` +
        `<p>FRAD never asks candidates to pay a fee at any stage of recruitment.</p>`,
      // One alert per search per run, even if the job is retried.
      deduplicationKey: `job-alert:${savedSearch.id}:${now.toISOString().slice(0, 13)}`,
    })

    await prisma.savedSearch.update({ where: { id: savedSearch.id }, data: { lastRunAt: now, lastAlertAt: now } })
    sent++
  }

  return { considered: due.length, sent, matched }
}
