import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { deleteStoredFile } from '@/lib/s3'
import { logAudit } from '@/lib/audit'
import { enqueueEmail } from '@/lib/outbox'

export async function GET() {
  try { await requireRole('SYSTEM_ADMIN'); const requests = await prisma.dataDeletionRequest.findMany({ include: { candidate: { include: { user: { select: { email: true, accountStatus: true } }, applications: { select: { id: true, internalStatus: true } } } } }, orderBy: { requestedAt: 'desc' } }); return Response.json({ requests }) } catch (error) { return authzResponse(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('SYSTEM_ADMIN')
    const { id, decision, reason, legalOverride } = await parseBody(request, z.object({ id: z.string().min(1), decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(10).max(2000), legalOverride: z.boolean().optional().default(false) }))
    const item = await prisma.dataDeletionRequest.findUnique({ where: { id }, include: { candidate: { include: { user: true, applications: true } } } })
    if (!item) throw new AuthzError('Deletion request not found', 404)
    if (!['PENDING', 'LEGAL_REVIEW'].includes(item.status)) throw new AuthzError('This request has already been decided', 409)
    if (decision === 'REJECT') {
      await prisma.dataDeletionRequest.update({ where: { id }, data: { status: 'REJECTED', reason: `${item.reason || ''}\nDecision: ${reason}`, decidedBy: user.userId, decidedAt: new Date() } })
      await enqueueEmail({ recipient: item.candidate.user.email, subject: 'Decision on your FRAD privacy request', html: `<p>Your deletion request was not approved.</p><p>${reason.replace(/[<&]/g, value => value === '<' ? '&lt;' : '&amp;')}</p>`, deduplicationKey: `deletion-rejected:${id}` })
      await logAudit({ actorUserId: user.userId, action: 'DATA_DELETION_REJECTED', resourceType: 'DataDeletionRequest', resourceId: id, reason }); return Response.json({ success: true })
    }
    const protectedRecord = item.candidate.applications.some((application) => ['OFFER_ACCEPTED', 'PREBOARDING', 'READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus))
    if (protectedRecord && !legalOverride) throw new AuthzError('Successful recruitment records require explicit legal-retention override approval', 409)
    if (protectedRecord && item.status === 'PENDING') {
      await prisma.dataDeletionRequest.update({ where: { id }, data: { status: 'LEGAL_REVIEW', legalOverrideRequestedBy: user.userId, reason: `${item.reason || ''}\nLegal override requested: ${reason}` } })
      await logAudit({ actorUserId: user.userId, action: 'DATA_DELETION_LEGAL_OVERRIDE_REQUESTED', resourceType: 'DataDeletionRequest', resourceId: id, reason })
      return Response.json({ success: true, pendingIndependentApproval: true })
    }
    if (item.status === 'LEGAL_REVIEW') {
      if (item.legalOverrideRequestedBy === user.userId) throw new AuthzError('A different system administrator must approve the legal-retention override', 409)
      if (!legalOverride) throw new AuthzError('Confirm the independently reviewed legal-retention override', 409)
      await prisma.dataDeletionRequest.update({ where: { id }, data: { legalOverrideApprovedBy: user.userId } })
    }
    const applicationIds = item.candidate.applications.map((application) => application.id)
    const activeHold = await prisma.legalHold.findFirst({ where: { status: 'ACTIVE', OR: [
      { resourceType: 'USER', resourceId: item.candidate.userId },
      { resourceType: 'CANDIDATE', resourceId: item.candidateId },
      { resourceType: 'APPLICATION', resourceId: { in: applicationIds } },
    ] } })
    if (activeHold) throw new AuthzError('Deletion is blocked by an active legal hold', 409)
    const preboardings = await prisma.candidatePreboarding.findMany({ where: { applicationId: { in: applicationIds } }, select: { id: true } })
    const preboardingIds = preboardings.map((record) => record.id)
    const assets = await prisma.fileAsset.findMany({ where: { ownerUserId: item.candidate.userId }, select: { id: true, storageKey: true } })
    const assetIds = assets.map((asset) => asset.id)
    await prisma.$transaction([
      prisma.applicationFile.deleteMany({ where: { applicationId: { in: applicationIds }, fileAssetId: { in: assetIds } } }),
      prisma.candidateDocument.deleteMany({ where: { candidateId: item.candidateId } }),
      prisma.candidateRequiredDocument.updateMany({ where: { candidatePreboardingId: { in: preboardingIds }, fileAssetId: { in: assetIds } }, data: { fileAssetId: null, status: 'NOT_SUBMITTED' } }),
      prisma.candidatePolicyAcknowledgement.updateMany({ where: { candidatePreboardingId: { in: preboardingIds } }, data: { signatureData: null, signedFileId: null, signatureIpAddress: null, signatureUserAgent: null } }),
      prisma.candidatePreboardingForm.updateMany({ where: { candidatePreboardingId: { in: preboardingIds } }, data: { responseJson: null } }),
      prisma.applicationProfileSnapshot.updateMany({ where: { applicationId: { in: applicationIds } }, data: { profileJson: '{"deleted":true}' } }),
      prisma.applicationAnswer.updateMany({ where: { applicationId: { in: applicationIds } }, data: { answerJson: '{"deleted":true}' } }),
      prisma.candidateAssessmentAnswer.updateMany({ where: { candidateAssessment: { applicationId: { in: applicationIds } } }, data: { answerJson: null, markerComment: null } }),
      prisma.interview.updateMany({ where: { applicationId: { in: applicationIds } }, data: { candidateComment: null } }),
      prisma.offer.updateMany({ where: { applicationId: { in: applicationIds } }, data: { candidateComment: null, signatureName: null, signatureMethod: null, signatureIpAddress: null, signatureUserAgent: null, signedFileId: null } }),
      prisma.selectionDecision.updateMany({ where: { applicationId: { in: applicationIds } }, data: { justification: '[redacted following approved privacy request]' } }),
      prisma.accommodationRequest.deleteMany({ where: { applicationId: { in: applicationIds } } }),
      prisma.talentPoolMember.deleteMany({ where: { candidateId: item.candidateId } }),
      prisma.workItem.updateMany({ where: { applicationId: { in: applicationIds } }, data: { title: 'Recruitment work item (candidate deleted)', description: null, blockedReason: null } }),
      prisma.message.updateMany({ where: { messageThread: { applicationId: { in: applicationIds } } }, data: { body: '[removed following approved privacy request]', fileAssetId: null } }),
      prisma.notification.deleteMany({ where: { userId: item.candidate.userId } }),
      prisma.referee.deleteMany({ where: { applicationId: { in: applicationIds } } }),
      prisma.candidateEducation.deleteMany({ where: { candidateId: item.candidateId } }), prisma.candidateEmployment.deleteMany({ where: { candidateId: item.candidateId } }), prisma.candidateLicence.deleteMany({ where: { candidateId: item.candidateId } }), prisma.candidateCertification.deleteMany({ where: { candidateId: item.candidateId } }), prisma.candidateSkill.deleteMany({ where: { candidateId: item.candidateId } }), prisma.candidateLanguage.deleteMany({ where: { candidateId: item.candidateId } }),
      prisma.fileAsset.deleteMany({ where: { id: { in: assetIds } } }),
      prisma.candidateProfile.update({ where: { id: item.candidateId }, data: { legalFirstName: 'Deleted', middleName: null, lastName: 'Candidate', preferredName: null, nationality: null, countryOfResidence: null, state: null, lga: null, city: null, address: null, primaryPhone: null, alternatePhone: null } }),
      prisma.user.update({ where: { id: item.candidate.userId }, data: { email: `deleted-${randomUUID()}@privacy.invalid`, phone: null, accountStatus: 'SUSPENDED', sessionVersion: { increment: 1 } } }),
      prisma.dataDeletionRequest.update({ where: { id }, data: { status: 'COMPLETED', reason: `${item.reason || ''}\nDecision: ${reason}`, decidedBy: user.userId, decidedAt: new Date() } }),
    ])
    for (const asset of assets) await deleteStoredFile(asset.storageKey)
    await logAudit({ actorUserId: user.userId, action: 'DATA_DELETION_COMPLETED', resourceType: 'DataDeletionRequest', resourceId: id, reason, newValue: { legalOverride: Boolean(legalOverride), assetsRemoved: assets.length } })
    return Response.json({ success: true, assetsRemoved: assets.length })
  } catch (error) { return authzResponse(error) }
}
