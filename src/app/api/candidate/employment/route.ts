import { NextResponse } from 'next/server'
import { requireUser, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await parseBody(
      request,
      z
        .object({
          employer: z.string().trim().min(1).max(200),
          jobTitle: z.string().trim().min(1).max(200),
          employmentType: z.string().trim().min(1).max(80),
          country: z.string().trim().min(1).max(100),
          state: z.string().max(100).optional(),
          location: z.string().max(200).optional(),
          startDate: z.coerce.date(),
          endDate: z.coerce.date().optional(),
          isCurrent: z.boolean().optional(),
          responsibilities: z.string().max(5000).optional(),
          reasonForLeaving: z.string().max(1000).optional(),
          supervisorName: z.string().max(200).optional(),
          supervisorEmail: z.string().email().optional().or(z.literal('')),
          supervisorPhone: z.string().max(30).optional(),
          permissionToContact: z.boolean().default(false),
        })
        .superRefine((v, ctx) => {
          const now = new Date()
          if (v.startDate > now)
            ctx.addIssue({ code: 'custom', message: 'Start date cannot be in the future', path: ['startDate'] })
          if (v.endDate && v.endDate > now)
            ctx.addIssue({ code: 'custom', message: 'End date cannot be in the future', path: ['endDate'] })
          if (v.endDate && v.endDate < v.startDate)
            ctx.addIssue({ code: 'custom', message: 'End date must not precede start date', path: ['endDate'] })
          if (v.isCurrent && v.endDate)
            ctx.addIssue({ code: 'custom', message: 'Current employment cannot have an end date', path: ['endDate'] })
        })
    )
    const employment = await prisma.candidateEmployment.create({
      data: {
        candidateId: profile.id,
        employer: body.employer,
        jobTitle: body.jobTitle,
        employmentType: body.employmentType,
        country: body.country,
        state: body.state,
        location: body.location,
        startDate: body.startDate,
        endDate: body.endDate || null,
        isCurrent: body.isCurrent || false,
        responsibilities: body.responsibilities,
        reasonForLeaving: body.reasonForLeaving,
        supervisorName: body.supervisorName,
        supervisorEmail: body.supervisorEmail,
        supervisorPhone: body.supervisorPhone,
        permissionToContact: body.permissionToContact,
      },
    })
    await refreshProfileCompletion(profile.id)
    await logAudit({
      actorUserId: user.userId,
      action: 'EMPLOYMENT_CREATED',
      resourceType: 'CandidateEmployment',
      resourceId: employment.id,
    })

    return NextResponse.json({ employment })
  } catch (error) {
    return authzResponse(error)
  }
}
