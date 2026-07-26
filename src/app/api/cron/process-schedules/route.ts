import { NextResponse } from 'next/server'
import { processBackgroundSchedules } from '@/lib/background-jobs'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const maxDuration = 60 // Allow up to 60 seconds for background jobs on Vercel

export async function GET(request: Request) {
  try {
    const secret = request.headers.get('x-cron-secret')

    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      // No insecure fallback: refuse to run if the secret isn't configured.
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 503 })
    }
    const supplied = Buffer.from(secret || '')
    const expected = Buffer.from(expectedSecret)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    // A successful response means the tick actually finished. Returning before
    // processing completed made scheduler failures invisible to the caller and
    // gave operations no per-run counts to reconcile.
    let summary
    try {
      summary = await processBackgroundSchedules()
    } catch (error) {
      await prisma.operationalEvent.create({
        data: {
          eventType: 'SCHEDULED_JOB_FAILED',
          severity: 'CRITICAL',
          resourceType: 'Job',
          resourceId: 'PROCESS_SCHEDULES',
          detailsJson: JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' }),
        },
      }).catch(() => undefined)
      throw error
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    })
  } catch (error) {
    logger.error('Cron dispatch failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to start background processing' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
