import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshProfileCompletion } from '@/lib/profile-completion.server'

const schema = z
  .object({
    employer: z.string().trim().min(1).max(200),
    jobTitle: z.string().trim().min(1).max(200),
    employmentType: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(100),
    state: z.string().max(100).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    isCurrent: z.boolean().default(false),
    responsibilities: z.string().max(5000).optional().nullable(),
    reasonForLeaving: z.string().max(1000).optional().nullable(),
    supervisorName: z.string().max(200).optional().nullable(),
    supervisorEmail: z.string().email().optional().or(z.literal('')).nullable(),
    supervisorPhone: z.string().max(30).optional().nullable(),
    permissionToContact: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    const now = new Date()
    if (v.startDate > now)
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date cannot be in the future' })
    if (v.endDate && v.endDate > now)
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be in the future' })
    if (v.isCurrent && v.endDate)
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Current employment cannot have an end date' })
    if (v.endDate && v.endDate < v.startDate)
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must follow start date' })
  })

async function ensureOwned(id: string, userId: string) {
  const record = await prisma.candidateEmployment.findFirst({
    where: { id, candidate: { userId } },
    select: { id: true, candidateId: true },
  })
  if (!record) throw new AuthzError('Employment record not found', 404)
  return record
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const existing = await ensureOwned(params.id, user.userId)
    const data = await parseBody(request, schema)
    const employment = await prisma.candidateEmployment.update({
      where: { id: params.id },
      data: { ...data, endDate: data.isCurrent ? null : data.endDate },
    })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({
      actorUserId: user.userId,
      action: 'EMPLOYMENT_UPDATED',
      resourceType: 'CandidateEmployment',
      resourceId: params.id,
    })
    return Response.json({ employment })
  } catch (error) {
    return authzResponse(error)
  }
}
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const existing = await ensureOwned(params.id, user.userId)
    await prisma.candidateEmployment.delete({ where: { id: params.id } })
    await refreshProfileCompletion(existing.candidateId)
    await logAudit({
      actorUserId: user.userId,
      action: 'EMPLOYMENT_DELETED',
      resourceType: 'CandidateEmployment',
      resourceId: params.id,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
