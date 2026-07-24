import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const dutyStationId = searchParams.get('dutyStationId')
    const contractType = searchParams.get('contractType')
    const search = searchParams.get('search')

    const where: any = {
      status: 'OPEN',
      openingAt: { lte: new Date() },
      closingAt: { gte: new Date() },
    }

    if (departmentId) where.departmentId = departmentId
    if (dutyStationId) where.dutyStationId = dutyStationId
    if (contractType) where.contractType = contractType
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { referenceNumber: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    const vacancies = await prisma.vacancy.findMany({
      where,
      include: {
        department: true,
        dutyStation: true,
        project: true,
        questions: { orderBy: { displayOrder: 'asc' } },
        requiredDocuments: true,
      },
      orderBy: { closingAt: 'asc' },
    })

    return NextResponse.json({ vacancies })
  } catch (error: any) {
    console.error('Error fetching public vacancies:', error)
    return NextResponse.json({ error: 'Failed to load vacancies' }, { status: 500 })
  }
}
