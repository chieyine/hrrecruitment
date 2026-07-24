import { NextResponse } from 'next/server'
import { requireUser, authzResponse } from '@/lib/authz'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

/**
 * Links an already-uploaded FileAsset (from /api/assets/upload) to the
 * candidate's document library. No longer fabricates a phantom file asset.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { documentType, fileAssetId, expiryDate } = await parseBody(request, z.object({ documentType: z.string().trim().min(1).max(80), fileAssetId: z.string().min(1), expiryDate: z.coerce.date().optional() }))

    // The asset must exist and belong to this user.
    const asset = await prisma.fileAsset.findUnique({ where: { id: fileAssetId } })
    if (!asset || asset.ownerUserId !== user.userId || asset.virusScanStatus !== 'CLEAN') {
      return NextResponse.json({ error: 'Invalid file reference' }, { status: 400 })
    }

    const document = await prisma.candidateDocument.create({
      data: {
        candidateId: profile.id,
        fileAssetId: asset.id,
        documentType,
        expiryDate: expiryDate || null,
      },
      include: { fileAsset: true },
    })
    await refreshProfileCompletion(profile.id)

    await logAudit({
      actorUserId: user.userId,
      action: 'DOCUMENT_ADDED',
      resourceType: 'CandidateDocument',
      resourceId: document.id,
    })

    return NextResponse.json({ document })
  } catch (error) {
    return authzResponse(error)
  }
}
