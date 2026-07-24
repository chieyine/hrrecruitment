import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const schema = z.union([
  z.object({ kind: z.literal('SKILL'), name: z.string().trim().min(1).max(120), category: z.string().max(100).optional(), proficiency: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']).optional() }),
  z.object({ kind: z.literal('LANGUAGE'), language: z.string().trim().min(1).max(100), speakingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']), readingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']), writingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']) }),
  z.object({ kind: z.literal('CERTIFICATION'), name: z.string().trim().min(1).max(200), issuingBody: z.string().trim().min(1).max(200), credentialNumber: z.string().max(120).optional(), issueDate: z.coerce.date().optional(), expiryDate: z.coerce.date().optional(), fileId: z.string().optional() }).refine((value) => !value.expiryDate || !value.issueDate || value.expiryDate >= value.issueDate, { path: ['expiryDate'], message: 'Expiry date must follow issue date' }),
])

async function assertOwnedCleanFile(fileId: string | undefined, userId: string) {
  if (!fileId) return
  const file = await prisma.fileAsset.findFirst({
    where: { id: fileId, ownerUserId: userId, virusScanStatus: 'CLEAN' },
    select: { id: true },
  })
  if (!file) throw new AuthzError('Certification evidence file is unavailable or unsafe', 400)
}

export async function POST(request: Request) {
  try { const user = await requireUser(); const input = await parseBody(request, schema); const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } }); if (!profile) throw new AuthzError('Profile not found', 404); if (input.kind === 'CERTIFICATION') await assertOwnedCleanFile(input.fileId, user.userId); let item: { id: string }; if (input.kind === 'SKILL') item = await prisma.candidateSkill.create({ data: { candidateId: profile.id, name: input.name, category: input.category || null, proficiency: input.proficiency || null } }); else if (input.kind === 'LANGUAGE') item = await prisma.candidateLanguage.create({ data: { candidateId: profile.id, language: input.language, speakingLevel: input.speakingLevel, readingLevel: input.readingLevel, writingLevel: input.writingLevel } }); else item = await prisma.candidateCertification.create({ data: { candidateId: profile.id, name: input.name, issuingBody: input.issuingBody, credentialNumber: input.credentialNumber || null, issueDate: input.issueDate || null, expiryDate: input.expiryDate || null, fileId: input.fileId || null } }); await logAudit({ actorUserId: user.userId, action: `PROFILE_${input.kind}_ADDED`, resourceType: 'CandidateProfile', resourceId: profile.id }); return Response.json({ success: true, item }) } catch (error) { return authzResponse(error) }
}

const updateSchema = z.union([
  z.object({ id: z.string().min(1), kind: z.literal('SKILL'), name: z.string().trim().min(1).max(120), category: z.string().max(100).optional(), proficiency: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']).optional() }),
  z.object({ id: z.string().min(1), kind: z.literal('LANGUAGE'), language: z.string().trim().min(1).max(100), speakingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']), readingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']), writingLevel: z.enum(['BASIC','INTERMEDIATE','FLUENT','NATIVE']) }),
  z.object({ id: z.string().min(1), kind: z.literal('CERTIFICATION'), name: z.string().trim().min(1).max(200), issuingBody: z.string().trim().min(1).max(200), credentialNumber: z.string().max(120).optional(), issueDate: z.coerce.date().optional(), expiryDate: z.coerce.date().optional(), fileId: z.string().optional() }).refine((value) => !value.expiryDate || !value.issueDate || value.expiryDate >= value.issueDate, { path: ['expiryDate'], message: 'Expiry date must follow issue date' }),
])

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, updateSchema)
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) throw new AuthzError('Profile not found', 404)

    let count = 0
    if (input.kind === 'SKILL') {
      count = (await prisma.candidateSkill.updateMany({
        where: { id: input.id, candidateId: profile.id },
        data: { name: input.name, category: input.category || null, proficiency: input.proficiency || null },
      })).count
    } else if (input.kind === 'LANGUAGE') {
      count = (await prisma.candidateLanguage.updateMany({
        where: { id: input.id, candidateId: profile.id },
        data: { language: input.language, speakingLevel: input.speakingLevel, readingLevel: input.readingLevel, writingLevel: input.writingLevel },
      })).count
    } else {
      await assertOwnedCleanFile(input.fileId, user.userId)
      count = (await prisma.candidateCertification.updateMany({
        where: { id: input.id, candidateId: profile.id },
        data: { name: input.name, issuingBody: input.issuingBody, credentialNumber: input.credentialNumber || null, issueDate: input.issueDate || null, expiryDate: input.expiryDate || null, fileId: input.fileId || null },
      })).count
    }
    if (!count) throw new AuthzError('Profile item not found', 404)
    await logAudit({ actorUserId: user.userId, action: `PROFILE_${input.kind}_UPDATED`, resourceType: 'CandidateProfile', resourceId: profile.id })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}

export async function DELETE(request: Request) {
  try { const user = await requireUser(); const { kind, id } = await parseBody(request, z.object({ kind: z.enum(['SKILL','LANGUAGE','CERTIFICATION']), id: z.string().min(1) })); const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } }); if (!profile) throw new AuthzError('Profile not found', 404); let count = 0; if (kind === 'SKILL') count = (await prisma.candidateSkill.deleteMany({ where: { id, candidateId: profile.id } })).count; else if (kind === 'LANGUAGE') count = (await prisma.candidateLanguage.deleteMany({ where: { id, candidateId: profile.id } })).count; else count = (await prisma.candidateCertification.deleteMany({ where: { id, candidateId: profile.id } })).count; if (!count) throw new AuthzError('Profile item not found', 404); await logAudit({ actorUserId: user.userId, action: `PROFILE_${kind}_DELETED`, resourceType: 'CandidateProfile', resourceId: profile.id }); return Response.json({ success: true }) } catch (error) { return authzResponse(error) }
}
