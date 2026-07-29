import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { readFileAsset, verifySignature } from '@/lib/s3'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { hasStaffRole } from '@/lib/roles'

/**
 * Content-Disposition with both a sanitised ASCII fallback and an RFC 5987
 * UTF-8 form, so non-Latin filenames survive instead of being mangled.
 */
function contentDisposition(originalName: string, inline = false): string {
  const ascii = originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_') || 'download'
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const { searchParams } = new URL(request.url)
    const expires = Number(searchParams.get('expires') || 0)
    const sig = searchParams.get('sig') || ''

    const asset = await prisma.fileAsset.findUnique({ where: { id: params.id } })
    if (!asset) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Access control: a valid signed URL OR an authorised session.
    const signatureOk = verifySignature(params.id, expires, sig)
    // Resolve the session once: it was previously fetched again purely to
    // attribute the audit entry, doubling the database work on every download.
    const user = await getVerifiedUser()
    let authorized = signatureOk
    if (!authorized) {
      if (user) {
        authorized = asset.ownerUserId === user.userId
        if (!authorized && user.roles.includes('CANDIDATE')) {
          const [candidateOffer, assignedPolicy, assignedCourse, assignedDocument, candidateMessage] =
            await Promise.all([
              prisma.offer.findFirst({
                where: {
                  OR: [{ offerFileId: asset.id }, { signedFileId: asset.id }],
                  application: { candidate: { userId: user.userId } },
                  status: { in: ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'] },
                },
                select: { id: true },
              }),
              prisma.candidatePolicyAcknowledgement.findFirst({
                where: {
                  policyDocument: { fileAssetId: asset.id },
                  candidatePreboarding: { application: { candidate: { userId: user.userId } } },
                },
                select: { id: true },
              }),
              prisma.candidateCourse.findFirst({
                where: {
                  course: { contents: { some: { fileAssetId: asset.id } } },
                  candidatePreboarding: { application: { candidate: { userId: user.userId } } },
                },
                select: { id: true },
              }),
              prisma.candidateRequiredDocument.findFirst({
                where: {
                  fileAssetId: asset.id,
                  candidatePreboarding: { application: { candidate: { userId: user.userId } } },
                },
                select: { id: true },
              }),
              prisma.message.findFirst({
                where: {
                  fileAssetId: asset.id,
                  messageThread: {
                    restricted: false,
                    application: { candidate: { userId: user.userId } },
                  },
                },
                select: { id: true },
              }),
            ])
          authorized = Boolean(
            candidateOffer || assignedPolicy || assignedCourse || assignedDocument || candidateMessage
          )
        }
        if (!authorized && hasStaffRole(user.roles)) {
          const readAll = await hasPermission(user.userId, 'application.read.all')
          const readAssigned = await hasPermission(user.userId, 'application.read.assigned')
          if (readAll || readAssigned) {
            const related = await prisma.application.findFirst({
              where: {
                AND: [
                  {
                    OR: [
                      { files: { some: { fileAssetId: asset.id } } },
                      { candidate: { documents: { some: { fileAssetId: asset.id } } } },
                      {
                        preboardings: {
                          some: {
                            OR: [
                              { documents: { some: { fileAssetId: asset.id } } },
                              { tasks: { some: { evidenceFileId: asset.id } } },
                              {
                                policyAcknowledgements: {
                                  some: {
                                    OR: [{ signedFileId: asset.id }, { policyDocument: { fileAssetId: asset.id } }],
                                  },
                                },
                              },
                              { courses: { some: { certificateFileId: asset.id } } },
                            ],
                          },
                        },
                      },
                      { offers: { some: { OR: [{ offerFileId: asset.id }, { signedFileId: asset.id }] } } },
                      { messageThreads: { some: { messages: { some: { fileAssetId: asset.id } } } } },
                    ],
                  },
                  ...(readAll
                    ? []
                    : [
                        {
                          OR: [
                            { assignedReviewerId: user.userId },
                            { vacancy: { ownerUserId: user.userId } },
                            { interviews: { some: { panelMembers: { some: { userId: user.userId } } } } },
                          ],
                        },
                      ]),
                ],
              },
              select: { id: true },
            })
            authorized = Boolean(related)
          }
          const complaintRelated = Boolean(
            await prisma.complaintAttachment.findFirst({ where: { fileAssetId: asset.id }, select: { id: true } })
          )
          const canManageComplaints = complaintRelated && (await hasPermission(user.userId, 'complaint.manage'))
          if (!authorized && canManageComplaints) authorized = true
          if (authorized && asset.sensitivityClass === 'RESTRICTED') {
            // complaint.manage is an override only for an actual complaint
            // attachment; it must never unlock unrelated restricted identity,
            // medical, banking, or preboarding documents.
            authorized = (await hasPermission(user.userId, 'preboarding.restricted.read')) || canManageComplaints
          }
        }
      }
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only serve files that have passed the AV scan.
    if (asset.virusScanStatus !== 'CLEAN') {
      const msg =
        asset.virusScanStatus === 'INFECTED'
          ? 'File blocked by security scan'
          : 'File is still being scanned; try again shortly'
      return NextResponse.json({ error: msg }, { status: 403 })
    }

    const buffer = await readFileAsset(asset.storageKey)
    if (!buffer) {
      return NextResponse.json({ error: 'File contents unavailable' }, { status: 404 })
    }

    await logAudit({
      actorUserId: user?.userId,
      action: 'FILE_DOWNLOADED',
      resourceType: 'FileAsset',
      resourceId: asset.id,
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType || 'application/octet-stream',
        'Content-Disposition': contentDisposition(
          asset.originalName,
          searchParams.get('disposition') === 'inline' && asset.mimeType === 'application/pdf'
        ),
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logger.error('Asset download failed', {
      assetId: params.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
