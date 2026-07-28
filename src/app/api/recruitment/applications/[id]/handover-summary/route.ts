import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    await requirePermission('erp.transfer')

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
            education: true,
            employment: true,
            licences: true,
            documents: { include: { fileAsset: true } },
          },
        },
        vacancy: {
          include: { department: true, dutyStation: true },
        },
        offers: true,
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

    const handoverSummary = {
      recruitmentRecordId: application.id,
      candidateFullName:
        `${application.candidate.legalFirstName} ${application.candidate.middleName || ''} ${application.candidate.lastName}`.trim(),
      email: application.candidate.user?.email || null,
      primaryPhone: application.candidate.primaryPhone,
      address: application.candidate.address,
      state: application.candidate.state,
      lga: application.candidate.lga,
      jobTitle: application.vacancy.title,
      department: application.vacancy.department.name,
      dutyStation: application.vacancy.dutyStation.name,
      contractType: application.vacancy.contractType,
      salary: application.offers[0]?.salary || null,
      plannedStartDate: application.offers[0]?.startDate || application.resumptionRecord?.plannedStartDate,
      actualResumptionDate: application.resumptionRecord?.actualStartDate,
      resumptionOutcome: application.resumptionRecord?.outcome || null,
      applicationStatus: application.internalStatus,
      preboardingReadinessStatus: application.preboardings[0]?.readinessStatus || 'PENDING',
      erpPersonnelNumber: application.erpTransferRecord?.erpPersonnelNumber || null,
      transferredAt: application.erpTransferRecord?.createdInErpAt || null,
      verifiedDocuments: application.candidate.documents
        .filter((document) => document.status === 'APPROVED')
        .map((document) => ({
          id: document.fileAssetId,
          type: document.documentType,
          name: document.fileAsset.originalName,
        })),
      educationRecords: application.candidate.education.length,
      employmentRecords: application.candidate.employment.length,
      verifiedLicences: application.candidate.licences.filter((licence) => licence.verificationStatus === 'VERIFIED')
        .length,
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
