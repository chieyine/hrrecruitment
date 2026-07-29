import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('erp.transfer')

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
            documents: { include: { fileAsset: true } },
          },
        },
        vacancy: {
          include: { department: true, dutyStation: true },
        },
        offers: { where: { status: 'ACCEPTED' }, orderBy: { acceptedAt: 'desc' }, take: 1 },
        preboardings: {
          include: {
            forms: true,
            documents: true,
            policyAcknowledgements: true,
            courses: true,
            tasks: true,
            meetings: true,
            infoItems: true,
            readinessChecks: true,
            readinessConfirmation: true,
          },
        },
        resumptionRecord: true,
        erpTransferRecord: true,
      },
    })

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!['READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)) {
      return NextResponse.json({ error: 'Joining handover is not available at this stage' }, { status: 409 })
    }

    const handoverSummary = {
      recruitmentRecordId: application.id,
      candidateFullName:
        `${application.candidate.legalFirstName} ${application.candidate.middleName || ''} ${application.candidate.lastName}`.trim(),
      email: application.candidate.user?.email || null,
      primaryPhone: application.candidate.primaryPhone,
      jobTitle: application.vacancy.title,
      department: application.vacancy.department.name,
      dutyStation: application.vacancy.dutyStation.name,
      contractType: application.vacancy.contractType,
      salary: application.offers[0]?.salary || null,
      plannedStartDate: application.resumptionRecord?.plannedStartDate || application.offers[0]?.startDate,
      actualResumptionDate: application.resumptionRecord?.actualStartDate,
      resumptionOutcome: application.resumptionRecord?.outcome || null,
      applicationStatus: application.internalStatus,
      preboardingReadinessStatus: application.preboardings[0]?.readinessStatus || 'PENDING',
      erpPersonnelNumber: application.erpTransferRecord?.erpPersonnelNumber || null,
      transferredAt: application.erpTransferRecord?.createdInErpAt || null,
      verifiedDocumentCount: application.candidate.documents.filter((document) => document.status === 'APPROVED')
        .length,
      capabilities: {
        recordAdverseOutcome: user.roles.includes('HR_MANAGER'),
      },
      preboarding: application.preboardings[0]
        ? {
            forms: application.preboardings[0].forms.map((item) => item.status),
            documents: application.preboardings[0].documents.map((item) => item.status),
            policies: application.preboardings[0].policyAcknowledgements.map((item) => item.status),
            courses: application.preboardings[0].courses.map((item) => item.status),
            tasks: application.preboardings[0].tasks.map((item) => item.status),
            meetings: application.preboardings[0].meetings.map((item) => item.status),
            informationAcknowledged: application.preboardings[0].infoItems.filter(
              (item) => !item.acknowledgementRequired || item.acknowledgedAt
            ).length,
            readinessChecks: application.preboardings[0].readinessChecks.map((item) => ({
              check: item.checkType,
              status: item.status,
            })),
          }
        : null,
    }

    return NextResponse.json({ handoverSummary })
  } catch (err) {
    return authzResponse(err)
  }
}
