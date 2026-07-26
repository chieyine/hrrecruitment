import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  suspectContact: z.string().trim().min(3).max(500),
  incidentDetails: z.string().trim().min(20).max(10000),
  reporterEmail: z.string().email().optional().or(z.literal('')),
})
export async function POST(request: Request) {
  try {
    const limit = await rateLimitDistributed(`fraud:${clientIp(request)}`, 3, 60_000)
    if (!limit.allowed)
      return NextResponse.json({ error: 'Too many reports; please try again later.' }, { status: 429 })
    const input = await parseBody(request, schema)
    const report = await prisma.fraudReport.create({
      data: {
        suspectContact: input.suspectContact,
        incidentDetails: input.incidentDetails,
        reporterEmail: input.reporterEmail || null,
      },
    })
    const admins = await prisma.user.findMany({
      where: { userRoles: { some: { role: { name: { in: ['SYSTEM_ADMIN', 'HR_MANAGER'] } } } } },
      select: { id: true },
    })
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          type: 'FRAUD_REPORT',
          title: 'Confidential recruitment fraud report',
          body: `A new recruitment fraud report requires review. Open the fraud report queue at /admin/fraud-reports (reference ${report.id}).`,
        })
      )
    )
    return NextResponse.json({ success: true, reference: report.id })
  } catch (err) {
    return authzResponse(err)
  }
}
