import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const document = await prisma.candidateDocument.findFirst({
      where: { id: params.id, candidate: { userId: user.userId } },
    })
    if (!document) throw new AuthzError('Document not found', 404)
    const data = await parseBody(
      request,
      z.object({
        documentType: z.string().trim().min(1).max(80),
        expiryDate: z.coerce.date().nullable().optional(),
      })
    )
    const configuredType = await prisma.documentType.findFirst({
      where: { code: data.documentType, active: true },
      select: { id: true },
    })
    const hasConfiguredTypes = (await prisma.documentType.count({ where: { active: true } })) > 0
    if (!configuredType && (hasConfiguredTypes || !['CV', 'COVER_LETTER'].includes(data.documentType))) {
      throw new AuthzError('Choose an available document category', 400)
    }
    const updated = await prisma.candidateDocument.update({ where: { id: document.id }, data })
    await logAudit({
      actorUserId: user.userId,
      action: 'DOCUMENT_METADATA_UPDATED',
      resourceType: 'CandidateDocument',
      resourceId: document.id,
    })
    return Response.json({ document: updated })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const document = await prisma.candidateDocument.findFirst({
      where: { id: params.id, candidate: { userId: user.userId } },
    })
    if (!document) throw new AuthzError('Document not found', 404)
    const used = await prisma.applicationFile.count({ where: { fileAssetId: document.fileAssetId } })
    if (used) throw new AuthzError('This document is preserved with a submitted application and cannot be deleted', 409)
    await prisma.candidateDocument.delete({ where: { id: document.id } })
    await refreshProfileCompletion(document.candidateId)
    await logAudit({
      actorUserId: user.userId,
      action: 'DOCUMENT_DELETED',
      resourceType: 'CandidateDocument',
      resourceId: document.id,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
