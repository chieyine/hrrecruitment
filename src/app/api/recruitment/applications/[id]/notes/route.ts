import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  content: z.string().trim().min(1).max(10_000),
  category: z.string().trim().min(1).max(80).optional(),
  restricted: z.boolean().optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('application.stage.change')

    const { content, category, restricted } = await parseBody(request, schema)

    const application = await prisma.application.findUnique({ where: { id: params.id } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const note = await prisma.applicationNote.create({
      data: {
        applicationId: params.id,
        authorUserId: user.userId,
        category: category || 'GENERAL',
        content,
        restricted: !!restricted,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'APPLICATION_NOTE_ADDED',
      resourceType: 'ApplicationNote',
      resourceId: note.id,
      newValue: { category: note.category, restricted: note.restricted },
    })

    return NextResponse.json({ note })
  } catch (err) {
    return authzResponse(err)
  }
}
