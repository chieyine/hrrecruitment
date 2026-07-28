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
          professionalBody: z.string().trim().min(1).max(200),
          licenceType: z.string().trim().min(1).max(200),
          licenceNumber: z.string().trim().min(1).max(200),
          issueDate: z.coerce.date(),
          expiryDate: z.coerce.date().optional(),
          evidenceFileId: z.string().optional(),
        })
        .refine((v) => !v.expiryDate || v.expiryDate >= v.issueDate, {
          message: 'Expiry date must not precede issue date',
          path: ['expiryDate'],
        })
    )
    if (
      body.evidenceFileId &&
      !(await prisma.fileAsset.findFirst({
        where: { id: body.evidenceFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      }))
    )
      throw new AuthzError('Licence evidence file is unavailable or unsafe', 400)
    const licence = await prisma.candidateLicence.create({
      data: {
        candidateId: profile.id,
        professionalBody: body.professionalBody,
        licenceType: body.licenceType,
        licenceNumber: body.licenceNumber,
        issueDate: body.issueDate,
        expiryDate: body.expiryDate || null,
        evidenceFileId: body.evidenceFileId,
      },
    })
    await refreshProfileCompletion(profile.id)
    await logAudit({
      actorUserId: user.userId,
      action: 'LICENCE_CREATED',
      resourceType: 'CandidateLicence',
      resourceId: licence.id,
    })

    return NextResponse.json({ licence })
  } catch (error) {
    return authzResponse(error)
  }
}
