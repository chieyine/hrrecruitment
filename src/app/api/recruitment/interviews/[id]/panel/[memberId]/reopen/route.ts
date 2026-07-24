import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
export async function POST(request: Request, context: { params: Promise<{ id: string; memberId: string }> }) {
  const params = await context.params; try { const user = await requirePermission('scorecard.reopen'); const { reason } = await parseBody(request, z.object({ reason: z.string().trim().min(5).max(1000) })); const submission = await prisma.interviewPanelSubmission.findFirst({ where: { interviewId: params.id, panelMemberId: params.memberId } }); if (!submission) throw new AuthzError('Panel submission not found', 404); await prisma.interviewPanelSubmission.update({ where: { id: submission.id }, data: { reopenedAt: new Date(), reopenedBy: user.userId, reopenReason: reason } }); await logAudit({ actorUserId: user.userId, action: 'INTERVIEW_SCORE_REOPENED', resourceType: 'InterviewPanelSubmission', resourceId: submission.id, reason }); return Response.json({ success: true }) } catch (error) { return authzResponse(error) } }
