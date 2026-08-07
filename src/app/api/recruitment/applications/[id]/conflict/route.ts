import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

const schema = z
  .object({
    conflictType: z.enum(['NONE', 'FAMILY', 'PERSONAL', 'SUPERVISORY', 'COLLEAGUE', 'FINANCIAL', 'OTHER']),
    details: z.string().max(2000).optional(),
  })
  .refine((value) => value.conflictType === 'NONE' || !!value.details?.trim(), {
    message: 'Conflict details are required',
    path: ['details'],
  })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('scorecard.submit')
    const data = await parseBody(request, schema)
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: { id: true, internalStatus: true },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    requireOpenRecruitmentFile(application.internalStatus)
    const declaration = await prisma.conflictDeclaration.create({
      data: {
        userId: user.userId,
        applicationId: application.id,
        conflictType: data.conflictType,
        details: data.details || null,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'CONFLICT_DECLARED',
      resourceType: 'ConflictDeclaration',
      resourceId: declaration.id,
      newValue: { conflictType: data.conflictType },
    })
    return NextResponse.json({ success: true, declaration })
  } catch (err) {
    return authzResponse(err)
  }
}
