import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse } from '@/lib/authz'

export const dynamic = 'force-dynamic'

/** Returns the signed-in candidate's active preboarding record (if any). */
export async function GET() {
  try {
    const user = await requireUser()
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) return NextResponse.json({ preboarding: null })

    const preboarding = await prisma.candidatePreboarding.findFirst({
      where: { application: { candidateId: profile.id } },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true, status: true, overallCompletionPercentage: true, readinessStatus: true,
        startedAt: true, readyAt: true, completedAt: true, confirmedStartDate: true, startDateConfirmedAt: true,
        application: { select: { vacancy: { select: { title: true, referenceNumber: true, dutyStation: { select: { name: true, address: true } } } }, offers: { where: { status: 'ACCEPTED' }, orderBy: { acceptedAt: 'desc' }, take: 1, select: { startDate: true } } } },
        forms: { select: { id: true, status: true, required: true, dueAt: true, submittedAt: true, formTemplate: { select: { title: true } } } },
        documents: { select: { id: true, status: true, required: true, dueAt: true, submittedAt: true, expiryDate: true, documentRequirement: { select: { name: true } } } },
        policyAcknowledgements: { select: { id: true, status: true, required: true, dueAt: true, viewedAt: true, acknowledgedAt: true, signedAt: true, policyDocument: { select: { title: true } } } },
        courses: { select: { id: true, status: true, required: true, dueAt: true, startedAt: true, completedAt: true, score: true, attempts: true, course: { select: { title: true } } } },
        tasks: { select: { id: true, status: true, required: true, dueAt: true, completedAt: true, taskTemplate: { select: { title: true } } } },
        readinessChecks: { select: { id: true, checkType: true, status: true, waiverReason: true, reviewedAt: true } },
        meetings: { select: { id: true, status: true, title: true, scheduledStart: true, venue: true, meetingLink: true, candidateResponse: true } },
        infoItems: { select: { id: true, title: true, acknowledgedAt: true } },
      },
    })

    return NextResponse.json({ preboarding })
  } catch (err) {
    return authzResponse(err)
  }
}
