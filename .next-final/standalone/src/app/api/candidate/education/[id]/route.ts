import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

const educationSchema = z.object({
  institution: z.string().trim().min(1).max(200), qualification: z.string().trim().min(1).max(200),
  fieldOfStudy: z.string().trim().min(1).max(200), country: z.string().trim().min(1).max(100),
  startYear: z.coerce.number().int().min(1900).max(2100), completionYear: z.coerce.number().int().min(1900).max(2100),
  grade: z.string().trim().max(100).optional().nullable(),
  certificateFileId: z.string().optional().nullable(),
}).refine((v) => v.completionYear >= v.startYear, { message: 'Completion year must not precede start year', path: ['completionYear'] })

async function owned(id: string, userId: string) {
  const record = await prisma.candidateEducation.findFirst({ where: { id, candidate: { userId } } })
  if (!record) throw new AuthzError('Education record not found', 404)
  return record
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser(); const existing = await owned(params.id, user.userId)
    const data = await parseBody(request, educationSchema)
    if (data.certificateFileId && !await prisma.fileAsset.findFirst({ where: { id: data.certificateFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' } })) throw new AuthzError('Certificate file is unavailable or unsafe', 400)
    const education = await prisma.candidateEducation.update({ where: { id: params.id }, data })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({ actorUserId: user.userId, action: 'EDUCATION_UPDATED', resourceType: 'CandidateEducation', resourceId: params.id })
    return Response.json({ education })
  } catch (error) { return authzResponse(error) }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser(); const existing = await owned(params.id, user.userId)
    await prisma.candidateEducation.delete({ where: { id: params.id } })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({ actorUserId: user.userId, action: 'EDUCATION_DELETED', resourceType: 'CandidateEducation', resourceId: params.id })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}
