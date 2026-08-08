import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { applicationAccess } from '@/lib/recruitment-access'
import { hasStaffRole } from '@/lib/roles'

const schema = z
  .object({
    applicationId: z.string().min(1),
    title: z.string().trim().min(1),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    timezone: z.string().default('Africa/Lagos'),
    format: z.enum(['PHYSICAL', 'VIRTUAL', 'HYBRID']),
    interviewType: z.enum(['PANEL', 'TECHNICAL', 'COMPETENCY', 'FINAL']),
    venue: z.string().max(500).optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    instructions: z.string().max(5000).optional(),
    attachmentFileIds: z.array(z.string()).max(20).default([]),
    reminderMinutesBefore: z.coerce.number().int().min(0).max(43200).default(1440),
    panelUserIds: z.array(z.string().min(1)).min(1).max(25),
    questions: z
      .array(
        z.object({
          question: z.string().trim().min(1),
          competency: z.string().max(200).optional(),
          maximumScore: z.coerce.number().positive(),
          isSafeguarding: z.boolean().default(false),
        })
      )
      .min(1)
      .max(100),
  })
  .superRefine((value, context) => {
    if (value.scheduledEnd <= value.scheduledStart)
      context.addIssue({ code: 'custom', message: 'Interview end must follow start', path: ['scheduledEnd'] })
    if (new Set(value.panelUserIds).size !== value.panelUserIds.length)
      context.addIssue({ code: 'custom', message: 'Panel members must be unique', path: ['panelUserIds'] })
    if (value.format !== 'VIRTUAL' && !value.venue?.trim())
      context.addIssue({
        code: 'custom',
        message: 'A venue is required for physical or hybrid interviews',
        path: ['venue'],
      })
    if (value.format !== 'PHYSICAL' && !value.meetingLink?.trim())
      context.addIssue({
        code: 'custom',
        message: 'A meeting link is required for virtual or hybrid interviews',
        path: ['meetingLink'],
      })
    if (!value.questions.some((question) => question.isSafeguarding))
      context.addIssue({ code: 'custom', message: 'Mark at least one safeguarding question', path: ['questions'] })
  })

export async function POST(request: Request) {
  try {
    const user = await requireRole('RECRUITMENT_OFFICER', 'HR_MANAGER')
    const input = await parseBody(request, schema)
    if (input.scheduledStart <= new Date())
      return NextResponse.json({ error: 'Choose a future interview time' }, { status: 422 })
    const attachmentFileIds = input.attachmentFileIds ?? []
    const access = await applicationAccess(user.userId, input.applicationId)
    if (!access.readAll && !access.vacancyOwner && !access.assignedReviewer)
      return NextResponse.json({ error: 'Application not found or outside your assigned scope' }, { status: 404 })
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      select: {
        id: true,
        internalStatus: true,
        interviews: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true },
          take: 1,
        },
      },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(application.internalStatus))
      return NextResponse.json(
        { error: `Cannot schedule interview from ${application.internalStatus}` },
        { status: 422 }
      )
    if (application.interviews.length)
      return NextResponse.json(
        { error: 'This application already has an active interview. Reschedule or cancel it instead.' },
        { status: 409 }
      )
    const [panelUsers, attachmentFiles] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: input.panelUserIds }, accountStatus: 'ACTIVE' },
        include: { userRoles: { include: { role: true } } },
      }),
      attachmentFileIds.length
        ? prisma.fileAsset.findMany({
            where: { id: { in: attachmentFileIds }, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
            select: { id: true },
          })
        : [],
    ])
    if (
      panelUsers.length !== input.panelUserIds.length ||
      panelUsers.some((member) => !hasStaffRole(member.userRoles.map((assignment) => assignment.role.name)))
    )
      return NextResponse.json({ error: 'Every panel member must be an active staff user' }, { status: 422 })
    if (attachmentFiles.length !== attachmentFileIds.length)
      return NextResponse.json({ error: 'An interview attachment is unavailable or unsafe' }, { status: 400 })
    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          applicationId: application.id,
          title: input.title,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          timezone: input.timezone,
          format: input.format,
          interviewType: input.interviewType,
          venue: input.venue || null,
          meetingLink: input.meetingLink || null,
          instructions: input.instructions || null,
          attachmentFileIdsJson: attachmentFileIds.length ? JSON.stringify(attachmentFileIds) : null,
          reminderMinutesBefore: input.reminderMinutesBefore,
          createdBy: user.userId,
          ...(user.roles.includes('HR_MANAGER')
            ? { panelApprovedAt: new Date(), panelApprovedBy: user.userId, panelApprovalComment: 'Automatically approved under the single HR Manager operating model.' }
            : {}),
          panelMembers: {
            create: input.panelUserIds.map((userId, index) => ({
              userId,
              panelRole: index === 0 ? 'CHAIR' : 'MEMBER',
            })),
          },
          questions: {
            create: input.questions.map((question, index) => ({
              ...question,
              displayOrder: index,
              commentRequired: true,
            })),
          },
        },
      })
      return created
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_SCHEDULED',
      resourceType: 'Interview',
      resourceId: interview.id,
    })
    if (user.roles.includes('HR_MANAGER'))
      await logAudit({ actorUserId: user.userId, action: 'INTERVIEW_PANEL_AUTO_APPROVED', resourceType: 'Interview', resourceId: interview.id, reason: 'Single HR Manager operating model' })
    return NextResponse.json({ success: true, interview })
  } catch (error) {
    return authzResponse(error)
  }
}
