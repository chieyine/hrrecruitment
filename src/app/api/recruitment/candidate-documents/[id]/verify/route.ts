import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'
import { hasPermission } from '@/lib/rbac'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requirePermission('application.read.all')
    if (!canRunRecruitmentOperations(user.roles)) throw new AuthzError('Document verification is restricted to the recruitment HR team', 403)
    const input = await parseBody(request, z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      verificationNotes: z.string().trim().min(5).max(3000),
      verificationSource: z.string().trim().min(2).max(500),
      restricted: z.boolean().default(false),
      rejectionReason: z.string().trim().min(5).max(2000).optional(),
    }).superRefine((value, context) => {
      if (value.status === 'REJECTED' && !value.rejectionReason)
        context.addIssue({ code: 'custom', path: ['rejectionReason'], message: 'Give the reason for rejection' })
    }))
    const existing = await prisma.candidateDocument.findUnique({ where: { id } })
    if (!existing) throw new AuthzError('Document not found', 404)
    if ((existing.restricted || input.restricted) && !(await hasPermission(user.userId, 'preboarding.restricted.read')))
      throw new AuthzError('Restricted document verification requires restricted-record access', 403)
    if (existing.status === 'SUPERSEDED') throw new AuthzError('Verify the current document version', 409)
    const document = await prisma.candidateDocument.update({
      where: { id },
      data: {
        status: input.status,
        verifiedBy: user.userId,
        verifiedAt: new Date(),
        verificationNotes: input.verificationNotes,
        verificationSource: input.verificationSource,
        restricted: input.restricted,
        rejectionReason: input.status === 'REJECTED' ? input.rejectionReason : null,
      },
    })
    await logAudit({ actorUserId: user.userId, action: 'CANDIDATE_DOCUMENT_VERIFIED', resourceType: 'CandidateDocument', resourceId: id, previousValue: existing, newValue: { status: input.status, verificationSource: input.verificationSource, restricted: input.restricted } })
    return Response.json({ success: true, document })
  } catch (error) {
    return authzResponse(error)
  }
}
