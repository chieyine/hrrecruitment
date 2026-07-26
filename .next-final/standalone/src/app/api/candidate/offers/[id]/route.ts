import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    let offer = await prisma.offer.findUnique({
      where: { id: params.id },
      select: { id: true, applicationId: true, position: true, dutyStation: true, contractType: true, contractDuration: true, salary: true, startDate: true, endDate: true, probationPeriod: true, reportingLine: true, conditions: true, acceptanceDeadline: true, status: true, offerFileId: true, signedFileId: true, candidateProposedStartDate: true, sentAt: true, viewedAt: true, acceptedAt: true, declinedAt: true, version: true, offerTemplate: { select: { bodyTemplate: true } }, application: { select: { candidate: { select: { userId: true, legalFirstName: true, preferredName: true, lastName: true } }, vacancy: { select: { title: true } } } } },
    })
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    if (offer.application.candidate.userId !== user.userId) {
      throw new AuthzError('Forbidden', 403)
    }
    const candidateVisibleStatuses = new Set(['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'])
    if (!candidateVisibleStatuses.has(offer.status)) {
      // Avoid confirming the existence of draft or superseded internal offers.
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Mark as viewed the first time the candidate opens it.
    if (offer.status === 'SENT') {
      await prisma.offer.updateMany({
        where: { id: offer.id, status: 'SENT', version: offer.version },
        data: { status: 'VIEWED', viewedAt: new Date() },
      })
      const current = await prisma.offer.findUnique({
        where: { id: offer.id },
        select: { id: true, applicationId: true, position: true, dutyStation: true, contractType: true, contractDuration: true, salary: true, startDate: true, endDate: true, probationPeriod: true, reportingLine: true, conditions: true, acceptanceDeadline: true, status: true, offerFileId: true, signedFileId: true, candidateProposedStartDate: true, sentAt: true, viewedAt: true, acceptedAt: true, declinedAt: true, version: true, offerTemplate: { select: { bodyTemplate: true } }, application: { select: { candidate: { select: { userId: true, legalFirstName: true, preferredName: true, lastName: true } }, vacancy: { select: { title: true } } } } },
      })
      if (!current || current.application.candidate.userId !== user.userId || !candidateVisibleStatuses.has(current.status)) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      }
      offer = current
    }

    const { application, offerTemplate, ...candidateOffer } = offer
    const candidateName = `${application.candidate.legalFirstName} ${application.candidate.lastName}`
    const template = offerTemplate?.bodyTemplate || 'Dear {{candidate_name}},\\n\\nWe are pleased to offer you the position of {{position}} in {{duty_station}}. Please review the terms below and respond before {{acceptance_deadline}}.'
    const renderedBody = template.replace(/\{\{([a-z_]+)\}\}/gi, (token, key) => ({
      candidate_name: candidateName,
      candidate_first_name: application.candidate.preferredName || application.candidate.legalFirstName,
      position: candidateOffer.position,
      vacancy_title: application.vacancy.title,
      duty_station: candidateOffer.dutyStation,
      contract_type: candidateOffer.contractType,
      salary: candidateOffer.salary,
      start_date: candidateOffer.startDate.toLocaleDateString('en-GB'),
      acceptance_deadline: candidateOffer.acceptanceDeadline.toLocaleDateString('en-GB'),
      reporting_line: candidateOffer.reportingLine || '',
    } as Record<string, string>)[key] ?? token)
    return NextResponse.json({ offer: { ...candidateOffer, vacancyTitle: application.vacancy.title, candidateName, renderedBody } })
  } catch (err) {
    return authzResponse(err)
  }
}
