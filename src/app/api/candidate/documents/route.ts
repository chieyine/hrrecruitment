import { NextResponse } from 'next/server'
import { requireUser, authzResponse } from '@/lib/authz'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

/**
 * The configured document categories, so the candidate's upload form offers the
 * same list an administrator maintains in /admin/document-types rather than a
 * hardcoded copy that silently drifts.
 */
export async function GET(request: Request) {
  try {
    await requireUser()
    if (new URL(request.url).searchParams.get('types') !== '1') {
      return NextResponse.json({ error: 'Unsupported request' }, { status: 400 })
    }
    const documentTypes = await prisma.documentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { code: true, name: true, allowedFileTypes: true, maximumFileSize: true },
      take: 200,
    })
    return NextResponse.json({ documentTypes })
  } catch (error) {
    return authzResponse(error)
  }
}

/**
 * Links an already-uploaded FileAsset (from /api/assets/upload) to the
 * candidate's document library. No longer fabricates a phantom file asset.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { documentType, fileAssetId, expiryDate } = await parseBody(
      request,
      z.object({
        documentType: z.string().trim().min(1).max(80),
        fileAssetId: z.string().min(1),
        expiryDate: z.coerce.date().optional(),
      })
    )

    // The asset must exist and belong to this user.
    const asset = await prisma.fileAsset.findUnique({ where: { id: fileAssetId } })
    if (!asset || asset.ownerUserId !== user.userId || asset.virusScanStatus !== 'CLEAN') {
      return NextResponse.json({ error: 'Invalid file reference' }, { status: 400 })
    }
    const configuredType = await prisma.documentType.findFirst({
      where: { code: documentType, active: true },
      select: { allowedFileTypes: true, maximumFileSize: true },
    })
    const fallbackTypes = new Set(['CV', 'COVER_LETTER'])
    const hasConfiguredTypes = (await prisma.documentType.count({ where: { active: true } })) > 0
    if (!configuredType && (hasConfiguredTypes || !fallbackTypes.has(documentType))) {
      return NextResponse.json({ error: 'Choose an available document category' }, { status: 400 })
    }
    if (configuredType) {
      const allowed = configuredType.allowedFileTypes
        .split(',')
        .map((value) => value.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
      const extension = asset.originalName.split('.').pop()?.toLowerCase() || ''
      if (!allowed.includes(extension)) {
        return NextResponse.json(
          { error: `This category accepts: ${allowed.map((value) => value.toUpperCase()).join(', ')}` },
          { status: 400 }
        )
      }
      if (asset.sizeBytes > configuredType.maximumFileSize) {
        return NextResponse.json({ error: 'This file exceeds the size limit for this category' }, { status: 400 })
      }
    }

    const document = await prisma.$transaction(async (tx) => {
      const latest = await tx.candidateDocument.findFirst({
        where: { candidateId: profile.id, documentType },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      })
      await tx.candidateDocument.updateMany({
        where: { candidateId: profile.id, documentType, status: { not: 'SUPERSEDED' } },
        data: { status: 'SUPERSEDED', supersededAt: new Date() },
      })
      return tx.candidateDocument.create({
        data: {
          candidateId: profile.id,
          fileAssetId: asset.id,
          documentType,
          expiryDate: expiryDate || null,
          versionNumber: (latest?.versionNumber || 0) + 1,
        },
        include: { fileAsset: true },
      })
    })
    await refreshProfileCompletion(profile.id)

    await logAudit({
      actorUserId: user.userId,
      action: 'DOCUMENT_VERSION_ADDED',
      resourceType: 'CandidateDocument',
      resourceId: document.id,
    })

    return NextResponse.json({ document })
  } catch (error) {
    return authzResponse(error)
  }
}
