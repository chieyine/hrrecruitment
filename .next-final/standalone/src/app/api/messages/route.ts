import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { createNotification } from '@/lib/notifications'
import { hasPermission } from '@/lib/rbac'
import { parseBody } from '@/lib/validation'
import { rateLimitDistributed } from '@/lib/rate-limit'
import { z } from 'zod'
import { hasStaffRole } from '@/lib/roles'

const messageSchema = z.object({ threadId: z.string().min(1).optional(), applicationId: z.string().min(1).optional(), body: z.string().trim().min(1).max(10_000), subject: z.string().trim().min(1).max(200).optional() }).refine((value) => Boolean(value.threadId || value.applicationId), 'threadId or applicationId is required')

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!hasStaffRole(user.roles)) return NextResponse.json({ templates: [] })
    const query = new URL(request.url).searchParams
    const applicationId = query.get('applicationId')
    const threadId = query.get('threadId')
    const thread = threadId ? await prisma.messageThread.findUnique({ where: { id: threadId }, select: { applicationId: true } }) : null
    const targetId = applicationId || thread?.applicationId
    if (!targetId) throw new AuthzError('Application context is required', 400)
    const readAll = await hasPermission(user.userId, 'application.read.all')
    const application = await prisma.application.findFirst({
      where: {
        id: targetId,
        ...(readAll ? {} : { OR: [{ assignedReviewerId: user.userId }, { vacancy: { ownerUserId: user.userId } }] }),
      },
      include: { candidate: true, vacancy: true },
    })
    if (!application) throw new AuthzError('Application not found or outside your assigned scope', 404)
    const templates = await prisma.notificationTemplate.findMany({ where: { active: true }, orderBy: { code: 'asc' }, take: 100 })
    const variables: Record<string, string> = {
      candidate_name: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
      candidate_first_name: application.candidate.preferredName || application.candidate.legalFirstName,
      vacancy_title: application.vacancy.title,
      vacancy_reference: application.vacancy.referenceNumber,
      application_status: application.internalStatus.replaceAll('_', ' ').toLowerCase(),
      deadline: 'the deadline shown in your account',
      due_date: 'the due date shown in your account',
      item_title: 'the outstanding item in your account',
    }
    const render = (value: string) => value.replace(/\{\{([a-z_]+)\}\}/gi, (token, key) => variables[key] ?? token)
    return NextResponse.json({ templates: templates.map((template) => ({ id: template.id, code: template.code, subject: render(template.subject), body: render(template.bodyTemplate), version: template.version })) })
  } catch (error) {
    return authzResponse(error)
  }
}

/**
 * Post a message. Either into an existing thread (`threadId`) or onto an
 * application (`applicationId`), creating a default thread if needed.
 * Access: the candidate who owns the application, or any staff user.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { threadId, applicationId, body, subject } = await parseBody(request, messageSchema)
    const limit = await rateLimitDistributed(`messages:${user.userId}`, 30, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many messages. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

    const isStaff = hasStaffRole(user.roles)

    async function assertAccess(appId: string) {
      const app = await prisma.application.findUnique({
        where: { id: appId },
        include: { candidate: { select: { userId: true } } },
      })
      if (!app) throw new AuthzError('Application not found', 404)
      if (!isStaff) {
        if (app.candidate.userId !== user.userId) throw new AuthzError('Forbidden', 403)
      } else {
        const readAll = await hasPermission(user.userId, 'application.read.all')
        const assigned = await hasPermission(user.userId, 'application.read.assigned') && Boolean(await prisma.application.findFirst({ where: { id: appId, OR: [{ assignedReviewerId: user.userId }, { vacancy: { ownerUserId: user.userId } }] }, select: { id: true } }))
        if (!readAll && !assigned) throw new AuthzError('Forbidden', 403)
      }
      return app
    }

    let thread
    if (threadId) {
      thread = await prisma.messageThread.findUnique({ where: { id: threadId } })
      if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      await assertAccess(thread.applicationId)
      if (thread.restricted && (!isStaff || !await hasPermission(user.userId, 'preboarding.restricted.read'))) throw new AuthzError('Restricted thread permission is required', 403)
    } else if (applicationId) {
      await assertAccess(applicationId)
      thread = await prisma.messageThread.findFirst({
        where: { applicationId, restricted: false },
      })
      if (!thread) {
        thread = await prisma.messageThread.create({
          data: { applicationId, subject: subject || 'General enquiry', category: 'GENERAL' },
        })
      }
    } else {
      throw new AuthzError('threadId or applicationId is required', 400)
    }

    const message = await prisma.message.create({
      data: { messageThreadId: thread.id, senderUserId: user.userId, body },
    })

    // Notify the candidate when staff replies.
    if (isStaff) {
      const app = await prisma.application.findUnique({
        where: { id: thread.applicationId },
        include: { candidate: { select: { userId: true } } },
      })
      if (app?.candidate.userId) {
        await createNotification({
          userId: app.candidate.userId,
          type: 'MESSAGE_RECEIVED',
          title: 'New message from HR',
          body: 'You have a new message in your recruitment portal.',
        })
      }
    }

    return NextResponse.json({ success: true, messageId: message.id, threadId: thread.id })
  } catch (err) {
    return authzResponse(err)
  }
}
