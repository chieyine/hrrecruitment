import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'

function icsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: {
        application: {
          select: {
            candidate: { select: { userId: true } },
            vacancy: { select: { title: true } },
          },
        },
        panelMembers: { select: { userId: true } },
      },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    const isCandidate = interview.application.candidate.userId === user.userId
    const isPanel = interview.panelMembers.some((member) => member.userId === user.userId)
    const canManage = await hasPermission(user.userId, 'interview.manage')
    if (!isCandidate && !isPanel && !canManage) throw new AuthzError('Forbidden', 403)
    const location = interview.meetingLink || interview.venue || ''
    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FRAD//Recruitment Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:interview-${interview.id}@frad`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(interview.scheduledStart)}`,
      `DTEND:${icsDate(interview.scheduledEnd)}`,
      `SUMMARY:${icsText(interview.title)}`,
      `DESCRIPTION:${icsText(`FRAD interview for ${interview.application.vacancy.title}`)}`,
      `LOCATION:${icsText(location)}`,
      `URL:${icsText(interview.meetingLink || '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n')
    return new Response(calendar, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="frad-interview-${interview.id.slice(0, 8)}.ics"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
