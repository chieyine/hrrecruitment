import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const profileFields = ['legalFirstName', 'middleName', 'lastName', 'preferredName', 'nationality', 'countryOfResidence', 'state', 'lga', 'city', 'address', 'primaryPhone', 'alternatePhone', 'preferredContactMethod', 'willingnessToRelocate', 'earliestStartDate'] as const

async function preview(primaryCandidateId: string, duplicateCandidateId: string) {
  if (primaryCandidateId === duplicateCandidateId) throw new AuthzError('Choose two different candidate records', 400)
  const records = await prisma.candidateProfile.findMany({ where: { id: { in: [primaryCandidateId, duplicateCandidateId] } }, include: { user: { select: { email: true, phone: true, accountStatus: true } }, applications: { select: { id: true, vacancyId: true, vacancy: { select: { referenceNumber: true, title: true } } } }, talentPoolMemberships: { select: { talentPoolId: true } }, _count: { select: { education: true, employment: true, licences: true, certifications: true, skills: true, languages: true, documents: true, applications: true, consentRecords: true } } } })
  const primary = records.find((item) => item.id === primaryCandidateId)
  const duplicate = records.find((item) => item.id === duplicateCandidateId)
  if (!primary || !duplicate) throw new AuthzError('One or both candidate records were not found', 404)
  const primaryVacancies = new Set(primary.applications.map((item) => item.vacancyId))
  const applicationConflicts = duplicate.applications.filter((item) => primaryVacancies.has(item.vacancyId)).map((item) => ({ vacancy: item.vacancy.referenceNumber, title: item.vacancy.title }))
  const primaryPools = new Set(primary.talentPoolMemberships.map((item) => item.talentPoolId))
  const poolConflicts = duplicate.talentPoolMemberships.filter((item) => primaryPools.has(item.talentPoolId)).length
  return {
    primary,
    duplicate,
    fields: profileFields.map((field) => ({ field, primary: primary[field] ?? null, duplicate: duplicate[field] ?? null })),
    counts: { primary: primary._count, duplicate: duplicate._count },
    conflicts: { applications: applicationConflicts, talentPools: poolConflicts },
    canMerge: applicationConflicts.length === 0 && poolConflicts === 0,
  }
}

export async function GET() {
  try {
    await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
    const reviews = await prisma.candidateMergeReview.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return Response.json({ reviews })
  } catch (error) { return authzResponse(error) }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
    const input = await parseBody(request, z.object({ primaryCandidateId: z.string().min(1), duplicateCandidateId: z.string().min(1), reason: z.string().trim().min(10).max(1000), survivorChoices: z.record(z.enum(['PRIMARY', 'DUPLICATE'])).default({}), previewOnly: z.boolean().default(true) }))
    const result = await preview(input.primaryCandidateId, input.duplicateCandidateId)
    if (input.previewOnly) return Response.json({ preview: result })
    if (!result.canMerge) throw new AuthzError('Resolve the listed application or talent-pool conflicts before requesting a merge', 409)
    const review = await prisma.candidateMergeReview.upsert({
      where: { primaryCandidateId_duplicateCandidateId: { primaryCandidateId: input.primaryCandidateId, duplicateCandidateId: input.duplicateCandidateId } },
      update: { status: 'DRAFT', requestedBy: user.userId, previewJson: JSON.stringify(result), survivorChoicesJson: JSON.stringify(input.survivorChoices), reason: input.reason, approvedBy: null, approvedAt: null, mergedAt: null, lockVersion: { increment: 1 } },
      create: { primaryCandidateId: input.primaryCandidateId, duplicateCandidateId: input.duplicateCandidateId, requestedBy: user.userId, previewJson: JSON.stringify(result), survivorChoicesJson: JSON.stringify(input.survivorChoices), reason: input.reason },
    })
    await logAudit({ actorUserId: user.userId, action: 'CANDIDATE_MERGE_REQUESTED', resourceType: 'CandidateMergeReview', resourceId: review.id, reason: input.reason, newValue: { primaryCandidateId: input.primaryCandidateId, duplicateCandidateId: input.duplicateCandidateId, survivorChoices: input.survivorChoices } })
    return Response.json({ review }, { status: 201 })
  } catch (error) { return authzResponse(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
    const input = await parseBody(request, z.object({ reviewId: z.string().min(1), action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'MERGE']), reason: z.string().trim().min(5).max(1000), lockVersion: z.number().int().positive() }))
    const review = await prisma.candidateMergeReview.findUnique({ where: { id: input.reviewId } })
    if (!review) throw new AuthzError('Merge review not found', 404)
    if (review.lockVersion !== input.lockVersion) throw new AuthzError('This review changed while you were viewing it. Refresh and try again.', 409)
    if (input.action === 'SUBMIT') {
      if (review.status !== 'DRAFT' || review.requestedBy !== user.userId) throw new AuthzError('Only the review owner can submit this draft', 409)
      await prisma.candidateMergeReview.update({ where: { id: review.id }, data: { status: 'PENDING', lockVersion: { increment: 1 } } })
    } else if (input.action === 'APPROVE') {
      if (review.status !== 'PENDING') throw new AuthzError('Only a pending merge can be approved', 409)
      if (review.requestedBy === user.userId) throw new AuthzError('A second HR user must approve this merge', 409)
      await prisma.candidateMergeReview.update({ where: { id: review.id }, data: { status: 'APPROVED', approvedBy: user.userId, approvedAt: new Date(), lockVersion: { increment: 1 } } })
    } else if (input.action === 'REJECT') {
      if (!['PENDING', 'APPROVED'].includes(review.status)) throw new AuthzError('This review cannot be rejected now', 409)
      if (review.requestedBy === user.userId) throw new AuthzError('A second HR user must decide this merge', 409)
      await prisma.candidateMergeReview.update({ where: { id: review.id }, data: { status: 'REJECTED', lockVersion: { increment: 1 } } })
    } else {
      if (review.status !== 'APPROVED') throw new AuthzError('The merge must be independently approved first', 409)
      const latest = await preview(review.primaryCandidateId, review.duplicateCandidateId)
      if (!latest.canMerge) throw new AuthzError('New conflicts appeared after approval. Review the merge again.', 409)
      const choices = JSON.parse(review.survivorChoicesJson || '{}') as Record<string, string>
      const survivorData: Record<string, unknown> = {}
      for (const field of profileFields) if (choices[field] === 'DUPLICATE') survivorData[field] = latest.duplicate[field]
      await prisma.$transaction(async (tx) => {
        await tx.candidateProfile.update({ where: { id: review.primaryCandidateId }, data: survivorData })
        await tx.candidateEducation.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateEmployment.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateLicence.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateCertification.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateSkill.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateLanguage.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.candidateDocument.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.consentRecord.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.dataDeletionRequest.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.talentPoolMember.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.application.updateMany({ where: { candidateId: review.duplicateCandidateId }, data: { candidateId: review.primaryCandidateId } })
        await tx.fileAsset.updateMany({ where: { ownerUserId: latest.duplicate.userId }, data: { ownerUserId: latest.primary.userId } })
        await tx.candidateProfile.delete({ where: { id: review.duplicateCandidateId } })
        await tx.user.update({ where: { id: latest.duplicate.userId }, data: { accountStatus: 'MERGED', sessionVersion: { increment: 1 } } })
        await tx.candidateMergeReview.update({ where: { id: review.id }, data: { status: 'MERGED', mergedAt: new Date(), lockVersion: { increment: 1 } } })
      })
    }
    await logAudit({ actorUserId: user.userId, action: `CANDIDATE_MERGE_${input.action}`, resourceType: 'CandidateMergeReview', resourceId: review.id, reason: input.reason, newValue: { primaryCandidateId: review.primaryCandidateId, duplicateCandidateId: review.duplicateCandidateId } })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}
