import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

const schema = z
  .object({
    professionalBody: z.string().trim().min(1).max(200),
    licenceType: z.string().trim().min(1).max(120),
    licenceNumber: z.string().trim().min(1).max(120),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional().nullable(),
    evidenceFileId: z.string().optional().nullable(),
  })
  .refine((v) => !v.expiryDate || v.expiryDate >= v.issueDate, {
    path: ['expiryDate'],
    message: 'Expiry date must follow issue date',
  })
async function ensureOwned(id: string, userId: string) {
  const record = await prisma.candidateLicence.findFirst({
    where: { id, candidate: { userId } },
    select: { id: true, candidateId: true },
  })
  if (!record) throw new AuthzError('Licence not found', 404)
  return record
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const existing = await ensureOwned(params.id, user.userId)
    const data = await parseBody(request, schema)
    if (data.evidenceFileId) {
      const evidence = await prisma.fileAsset.findFirst({
        where: { id: data.evidenceFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
        select: { id: true },
      })
      if (!evidence) throw new AuthzError('Licence evidence file is unavailable or unsafe', 400)
    }
    const licence = await prisma.candidateLicence.update({ where: { id: params.id }, data })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({
      actorUserId: user.userId,
      action: 'LICENCE_UPDATED',
      resourceType: 'CandidateLicence',
      resourceId: params.id,
    })
    return Response.json({ licence })
  } catch (error) {
    return authzResponse(error)
  }
}
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const existing = await ensureOwned(params.id, user.userId)
    await prisma.candidateLicence.delete({ where: { id: params.id } })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({
      actorUserId: user.userId,
      action: 'LICENCE_DELETED',
      resourceType: 'CandidateLicence',
      resourceId: params.id,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
