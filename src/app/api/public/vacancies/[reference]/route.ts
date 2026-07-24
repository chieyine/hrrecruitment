import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const params = await context.params;
  try {
    const now = new Date()
    const vacancy = await prisma.vacancy.findFirst({
      where: {
        referenceNumber: params.reference,
        status: 'OPEN',
        openingAt: { lte: now },
        closingAt: { gt: now },
      },
      include: {
        department: true,
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
