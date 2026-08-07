import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { login, logout } from './helpers'

const prisma = new PrismaClient()
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

type FixtureUsers = {
  hr: { id: string }
  officer: { id: string }
  hiringManager: { id: string }
  panelMember: { id: string }
  approver: { id: string }
  candidate: { id: string }
  department: { id: string }
  dutyStation: { id: string }
}

let fixture: FixtureUsers

async function createVacancy(ownerUserId: string, suffix: string, status = 'OPEN') {
  return prisma.vacancy.create({
    data: {
      referenceNumber: `ACC-${runId}-${suffix}`,
      title: `Acceptance vacancy ${suffix} ${runId}`,
      departmentId: fixture.department.id,
      dutyStationId: fixture.dutyStation.id,
      contractType: 'FIXED_TERM',
      numberOfPositions: 1,
      summary: 'Acceptance-test vacancy summary',
      responsibilities: 'Acceptance-test responsibilities',
      essentialQualifications: 'Acceptance-test qualifications',
      minimumExperienceYears: 1,
      openingAt: new Date(Date.now() - 86_400_000),
      closingAt: new Date(Date.now() + 7 * 86_400_000),
      status,
      ownerUserId,
    },
  })
}

async function createApplication(vacancyId: string, internalStatus = 'SUBMITTED') {
  return prisma.application.create({
    data: {
      candidateId: fixture.candidate.id,
      vacancyId,
      internalStatus,
      candidateVisibleStatus: internalStatus === 'INTERVIEW_INVITED' ? 'INTERVIEW_INVITED' : 'APPLICATION_SUBMITTED',
      submittedAt: new Date(),
    },
  })
}

test.describe('direct acceptance for specialist-role workflows', () => {
  test.beforeAll(async () => {
    const [hr, officer, hiringManager, panelMember, approver, candidateUser, department, dutyStation] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email: 'hrmanager@fradfoundation.org' }, select: { id: true } }),
        prisma.user.findUniqueOrThrow({ where: { email: 'recruitment.officer@fradfoundation.org' }, select: { id: true } }),
        prisma.user.findUniqueOrThrow({ where: { email: 'hiring.manager@fradfoundation.org' }, select: { id: true } }),
        prisma.user.findUniqueOrThrow({ where: { email: 'panel.member@fradfoundation.org' }, select: { id: true } }),
        prisma.user.findUniqueOrThrow({ where: { email: 'approver@fradfoundation.org' }, select: { id: true } }),
        prisma.user.findUniqueOrThrow({
          where: { email: 'candidate@example.com' },
          include: { candidateProfile: { select: { id: true } } },
        }),
        prisma.department.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
        prisma.dutyStation.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      ])
    if (!candidateUser.candidateProfile) throw new Error('The seeded candidate profile is missing')
    fixture = {
      hr,
      officer,
      hiringManager,
      panelMember,
      approver,
      candidate: candidateUser.candidateProfile,
      department,
      dutyStation,
    }
  })

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing acceptance scenarios run once on desktop Chromium')
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test('HR manager can record all four vacancy decisions with the correct transition', async ({ page }) => {
    const decisions = [
      { decision: 'APPROVED', expectedStatus: 'PENDING_APPROVAL', comment: undefined },
      {
        decision: 'APPROVED_WITH_CONDITIONS',
        storedDecision: 'CONDITIONS_PENDING',
        expectedStatus: 'PENDING_APPROVAL',
        comment: 'Publish after the safeguarding wording is added.',
      },
      { decision: 'RETURNED', expectedStatus: 'DRAFT', comment: 'Clarify the reporting line before resubmission.' },
      { decision: 'REJECTED', expectedStatus: 'DRAFT', comment: 'The approved headcount does not cover this vacancy.' },
    ] as const
    const records = []
    for (const [index, item] of decisions.entries()) {
      const vacancy = await createVacancy(fixture.officer.id, `approval-${index}`, 'PENDING_APPROVAL')
      const approval = await prisma.approval.create({
        data: {
          resourceType: 'VACANCY',
          resourceId: vacancy.id,
          approverUserId: fixture.hr.id,
          requestedBy: fixture.officer.id,
          decision: 'PENDING',
        },
      })
      records.push({ ...item, vacancy, approval })
    }

    await login(page, 'hrmanager@fradfoundation.org')
    for (const record of records) {
      const response = await page.request.post('/api/recruitment/approvals', {
        data: {
          approvalId: record.approval.id,
          decision: record.decision,
          comment: record.comment,
          lockVersion: record.approval.lockVersion,
        },
      })
      expect(response.status(), `${record.decision}: ${await response.text()}`).toBe(200)
      const [savedApproval, savedVacancy] = await Promise.all([
        prisma.approval.findUniqueOrThrow({ where: { id: record.approval.id } }),
        prisma.vacancy.findUniqueOrThrow({ where: { id: record.vacancy.id } }),
      ])
      expect(savedApproval.decision).toBe('storedDecision' in record ? record.storedDecision : record.decision)
      expect(savedVacancy.status).toBe(record.expectedStatus)
    }
    await logout(page)
  })

  test('hiring manager sees owned and assigned applications but not unrelated records', async ({ page }) => {
    const ownedVacancy = await createVacancy(fixture.hiringManager.id, 'manager-owned')
    const unrelatedVacancy = await createVacancy(fixture.hr.id, 'manager-hidden')
    const ownedApplication = await createApplication(ownedVacancy.id)
    const assignedApplication = await createApplication((await createVacancy(fixture.hr.id, 'manager-assigned')).id)
    await prisma.application.update({
      where: { id: assignedApplication.id },
      data: { assignedReviewerId: fixture.hiringManager.id },
    })
    const unrelatedApplication = await createApplication(unrelatedVacancy.id)

    await login(page, 'hiring.manager@fradfoundation.org')
    const vacancyResponse = await page.request.get('/api/recruitment/vacancies')
    expect(vacancyResponse.status()).toBe(200)
    const vacancyIds = (await vacancyResponse.json()).vacancies.map((vacancy: { id: string }) => vacancy.id)
    expect(vacancyIds).toContain(ownedVacancy.id)
    expect(vacancyIds).not.toContain(unrelatedVacancy.id)

    const applicationResponse = await page.request.get('/api/recruitment/applications')
    expect(applicationResponse.status()).toBe(200)
    const applicationIds = (await applicationResponse.json()).applications.map(
      (application: { id: string }) => application.id
    )
    expect(applicationIds).toContain(ownedApplication.id)
    expect(applicationIds).toContain(assignedApplication.id)
    expect(applicationIds).not.toContain(unrelatedApplication.id)
    await logout(page)
  })

  test('panel member scores independently and the chair workflow confirms the stage', async ({ page }) => {
    const vacancy = await createVacancy(fixture.hr.id, 'panel-score')
    const application = await createApplication(vacancy.id, 'INTERVIEW_INVITED')
    const interview = await prisma.interview.create({
      data: {
        applicationId: application.id,
        title: 'Acceptance panel interview',
        scheduledStart: new Date(Date.now() + 86_400_000),
        scheduledEnd: new Date(Date.now() + 90_000_000),
        status: 'CONFIRMED',
        createdBy: fixture.hr.id,
      },
    })
    const [member, question] = await Promise.all([
      prisma.interviewPanelMember.create({
        data: { interviewId: interview.id, userId: fixture.panelMember.id, panelRole: 'CHAIR' },
      }),
      prisma.interviewQuestion.create({
        data: {
          interviewId: interview.id,
          question: 'Describe a safeguarding decision.',
          maximumScore: 10,
          commentRequired: true,
        },
      }),
    ])

    await login(page, 'panel.member@fradfoundation.org')
    const response = await page.request.post(`/api/recruitment/interviews/${interview.id}/scores`, {
      data: {
        panelMemberId: member.id,
        recommendation: 'RECOMMENDED',
        conflictType: 'NONE',
        questionScores: [
          {
            interviewQuestionId: question.id,
            score: 8,
            comment: 'The answer used a clear risk-based escalation path.',
          },
        ],
      },
    })
    expect(response.status(), await response.text()).toBe(200)

    const [submission, pendingApplication, pendingInterview] = await Promise.all([
      prisma.interviewPanelSubmission.findUnique({ where: { panelMemberId: member.id } }),
      prisma.application.findUniqueOrThrow({ where: { id: application.id } }),
      prisma.interview.findUniqueOrThrow({ where: { id: interview.id } }),
    ])
    expect(submission?.totalScore).toBe(80)
    expect(submission?.recommendation).toBe('RECOMMENDED')
    expect(pendingInterview.status).toBe('PANEL_REVIEW')
    expect(pendingApplication.internalStatus).toBe('INTERVIEW_INVITED')
    await logout(page)

    await login(page, 'hrmanager@fradfoundation.org')
    const confirmation = await page.request.post(`/api/recruitment/interviews/${interview.id}/confirm-panel`, {
      data: {},
    })
    expect(confirmation.status(), await confirmation.text()).toBe(200)
    const [savedApplication, savedInterview] = await Promise.all([
      prisma.application.findUniqueOrThrow({ where: { id: application.id } }),
      prisma.interview.findUniqueOrThrow({ where: { id: interview.id } }),
    ])
    expect(savedInterview.status).toBe('ATTENDED')
    expect(savedInterview.panelConfirmedBy).toBe(fixture.hr.id)
    expect(savedApplication.internalStatus).toBe('INTERVIEW_COMPLETED')
    expect(savedApplication.interviewScore).toBe(80)
    await logout(page)
  })

  test('HR can record the canonical concerns outcome only with auditable evidence', async ({ page }) => {
    const vacancy = await createVacancy(fixture.hr.id, 'manual-reference')
    const application = await createApplication(vacancy.id, 'INTERVIEW_COMPLETED')
    const basePayload = {
      name: 'Acceptance Referee',
      organization: 'Reference Organisation',
      position: 'Line Manager',
      relationship: 'Former supervisor',
      email: `referee-${runId}@example.com`,
      permissionToContact: true,
      manualOutcome: 'SATISFACTORY_WITH_CONCERNS',
    }

    await login(page, 'hrmanager@fradfoundation.org')
    const missingEvidence = await page.request.post(`/api/recruitment/applications/${application.id}/referees`, {
      data: basePayload,
    })
    expect(missingEvidence.status()).toBe(400)

    const response = await page.request.post(`/api/recruitment/applications/${application.id}/referees`, {
      data: {
        ...basePayload,
        manualComment: 'Identity verified by telephone; the referee noted a manageable punctuality concern.',
      },
    })
    expect(response.status(), await response.text()).toBe(200)
    const saved = await prisma.application.findUniqueOrThrow({ where: { id: application.id } })
    const reference = await prisma.referenceResponse.findFirstOrThrow({
      where: { referenceRequest: { referee: { applicationId: application.id } } },
    })
    expect(saved.referenceStatus).toBe('SATISFACTORY_WITH_CONCERNS')
    expect(reference.outcome).toBe('SATISFACTORY_WITH_CONCERNS')
    expect(reference.confidentialComment).toContain('Identity verified')
    await logout(page)
  })
})
