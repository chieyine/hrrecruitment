import { NextResponse } from 'next/server'
import { requireUser, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { profileCompletion } from '@/lib/profile-completion'
import { parseBody } from '@/lib/validation'
import { z } from 'zod'

export async function GET() {
  try {
    const user = await requireUser()

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.userId },
      include: {
        education: true,
        employment: true,
        licences: true,
        certifications: true,
        skills: true,
        languages: true,
        documents: {
          include: { fileAsset: true },
        },
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    return authzResponse(error)
  }
}

// Only these fields may be set by the candidate (prevents mass-assignment of
// things like profileCompletionPercentage, userId, verification fields).
const EDITABLE_PROFILE_FIELDS = [
  'legalFirstName', 'middleName', 'lastName', 'preferredName', 'nationality',
  'countryOfResidence', 'state', 'lga', 'city', 'address', 'primaryPhone',
  'alternatePhone', 'preferredContactMethod', 'willingnessToRelocate', 'earliestStartDate',
  'preferredDutyLocationsJson',
] as const

function pickProfileFields(data: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (!(key in data)) continue
    if (key === 'willingnessToRelocate') out[key] = !!data[key]
    else if (key === 'earliestStartDate') out[key] = data[key] ? new Date(data[key]) : null
    else out[key] = data[key]
  }
  return out
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()

    const body = await parseBody(request, z.object({
      legalFirstName: z.string().trim().min(1).max(100).optional(),
      middleName: z.string().trim().max(100).nullable().optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      preferredName: z.string().trim().max(100).nullable().optional(),
      nationality: z.string().trim().max(100).nullable().optional(),
      countryOfResidence: z.string().trim().max(100).nullable().optional(),
      state: z.string().trim().max(100).nullable().optional(),
      lga: z.string().trim().max(100).nullable().optional(),
      city: z.string().trim().max(100).nullable().optional(),
      address: z.string().trim().max(500).nullable().optional(),
      primaryPhone: z.string().trim().max(30).nullable().optional(),
      alternatePhone: z.string().trim().max(30).nullable().optional(),
      preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS']).nullable().optional(),
      willingnessToRelocate: z.boolean().optional(),
      earliestStartDate: z.coerce.date().nullable().optional(),
      preferredDutyLocations: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    }))
    const data = pickProfileFields({
      ...body,
      ...(body.preferredDutyLocations ? { preferredDutyLocationsJson: JSON.stringify(body.preferredDutyLocations) } : {}),
    })

    let updated = await prisma.candidateProfile.upsert({
      where: { userId: user.userId },
      update: data,
      create: {
        userId: user.userId,
        legalFirstName: data.legalFirstName || 'First',
        lastName: data.lastName || 'Last',
        ...data,
      },
    })
    const completeProfile = await prisma.candidateProfile.findUnique({
      where: { id: updated.id },
      include: { education: { select: { id: true } }, employment: { select: { id: true } }, documents: { select: { id: true } }, licences: { select: { id: true } }, certifications: { select: { id: true } }, skills: { select: { id: true } }, languages: { select: { id: true } } },
    })
    const completion = profileCompletion(completeProfile)
    updated = await prisma.candidateProfile.update({
      where: { id: updated.id },
      data: { profileCompletionPercentage: completion.percentage },
    })

    await logAudit({ actorUserId: user.userId, action: 'CANDIDATE_PROFILE_UPDATED', resourceType: 'CandidateProfile', resourceId: updated.id, newValue: Object.keys(data) })

    return NextResponse.json({ profile: updated })
  } catch (error) {
    return authzResponse(error)
  }
}
