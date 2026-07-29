import { NextResponse } from 'next/server'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
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
          institution: z.string().trim().min(1).max(200),
          qualification: z.string().trim().min(1).max(200),
          fieldOfStudy: z.string().trim().min(1).max(200),
          country: z.string().trim().min(1).max(100),
          startYear: z.coerce.number().int().min(1900).max(2100),
          completionYear: z.preprocess(
            (value) => (value === '' || value === undefined ? null : value),
            z.coerce.number().int().min(1900).max(2100).nullable()
          ),
          isCurrent: z.boolean().default(false),
          grade: z.string().max(100).optional(),
          certificateFileId: z.string().optional(),
        })
        .superRefine((value, context) => {
          if (!value.isCurrent && !value.completionYear) {
            context.addIssue({ code: 'custom', path: ['completionYear'], message: 'Completion year is required' })
          }
          if (value.completionYear && value.completionYear < value.startYear) {
            context.addIssue({
              code: 'custom',
              path: ['completionYear'],
              message: 'Completion year must not precede start year',
            })
          }
        })
    )
    const completionYear = body.completionYear === null ? null : Number(body.completionYear)
    if (
      body.certificateFileId &&
      !(await prisma.fileAsset.findFirst({
        where: { id: body.certificateFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      }))
    )
      throw new AuthzError('Certificate file is unavailable or unsafe', 400)
    const education = await prisma.candidateEducation.create({
      data: {
        candidateId: profile.id,
        institution: body.institution,
        qualification: body.qualification,
        fieldOfStudy: body.fieldOfStudy,
        country: body.country,
        startYear: body.startYear,
        completionYear,
        isCurrent: body.isCurrent,
        grade: body.grade,
        certificateFileId: body.certificateFileId,
      },
    })
    await refreshProfileCompletion(profile.id)
    await logAudit({
      actorUserId: user.userId,
      action: 'EDUCATION_CREATED',
      resourceType: 'CandidateEducation',
      resourceId: education.id,
    })

    return NextResponse.json({ education })
  } catch (error) {
    return authzResponse(error)
  }
}
