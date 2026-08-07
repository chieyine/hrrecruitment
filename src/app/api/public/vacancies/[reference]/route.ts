import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { visibleAudiencesFor } from '@/lib/internal-identity'
import { logger } from '@/lib/logger'

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const params = await context.params
  try {
    const now = new Date()
    const viewer = await getVerifiedUser()
    const vacancy = await prisma.vacancy.findFirst({
      where: {
        referenceNumber: params.reference,
        status: 'OPEN',
        openingAt: { lte: now },
        closingAt: { gt: now },
        // §28.8 an internal vacancy is not reachable by guessing its reference
        // number: only a verified member of staff resolves one here.
        audience: { in: visibleAudiencesFor(viewer) },
      },
      include: {
        department: true,
        category: true,
        project: true,
        dutyStation: true,
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
        requiredDocuments: true,
      },
    })

    if (!vacancy) {
      return NextResponse.json({ error: 'Vacancy not found or closed' }, { status: 404 })
    }

    return NextResponse.json({ vacancy })
  } catch (error) {
    // Never echo the raw error: Prisma messages disclose schema internals to
    // completely unauthenticated callers.
    logger.error('Public vacancy lookup failed', {
      reference: params.reference,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to load vacancy' }, { status: 500 })
  }
}
