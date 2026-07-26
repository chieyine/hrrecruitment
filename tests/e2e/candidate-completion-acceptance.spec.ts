import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { login, logout } from './helpers'

const prisma = new PrismaClient()
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')

async function uploadPdf(page: import('@playwright/test').Page, name: string) {
  const response = await page.request.post('/api/assets/upload', {
    multipart: {
      file: { name, mimeType: 'application/pdf', buffer: pdfBytes },
    },
  })
  expect(response.status(), await response.text()).toBe(200)
  return (await response.json()).fileAssetId as string
}

test.describe('candidate offer, policy, and course completion', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing acceptance scenarios run once on desktop Chromium')
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test('candidate completes the documented offer and preboarding evidence paths', async ({ page }) => {
    test.setTimeout(180_000)
    const [hr, candidateUser, department, dutyStation] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'hrmanager@frad.org' }, select: { id: true } }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'candidate@example.com' },
        include: { candidateProfile: { select: { id: true } } },
      }),
      prisma.department.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.dutyStation.findFirstOrThrow({ where: { active: true }, select: { id: true, name: true } }),
    ])
    if (!candidateUser.candidateProfile) throw new Error('The seeded candidate profile is missing')

    await login(page, 'hrmanager@frad.org')
    const officialOfferFileId = await uploadPdf(page, `official-offer-${runId}.pdf`)
    await logout(page)

    const vacancy = await prisma.vacancy.create({
      data: {
        referenceNumber: `OFFER-ACC-${runId}`,
        title: `Offer completion acceptance ${runId}`,
        departmentId: department.id,
        dutyStationId: dutyStation.id,
        contractType: 'FIXED_TERM',
        summary: 'Offer acceptance fixture',
        responsibilities: 'Complete candidate workflow acceptance',
        essentialQualifications: 'Acceptance fixture qualification',
        openingAt: new Date(Date.now() - 86_400_000),
        closingAt: new Date(Date.now() + 7 * 86_400_000),
        status: 'OPEN',
        ownerUserId: hr.id,
      },
    })
    const application = await prisma.application.create({
      data: {
        candidateId: candidateUser.candidateProfile.id,
        vacancyId: vacancy.id,
        internalStatus: 'OFFER_SENT',
        candidateVisibleStatus: 'OFFER_AVAILABLE',
        offerStatus: 'SENT',
        submittedAt: new Date(),
      },
    })
    const offer = await prisma.offer.create({
      data: {
        applicationId: application.id,
        position: vacancy.title,
        dutyStation: dutyStation.name,
        contractType: 'FIXED_TERM',
        contractDuration: '12 months',
        salary: 'FRAD Grade 5',
        startDate: new Date(Date.now() + 30 * 86_400_000),
        acceptanceDeadline: new Date(Date.now() + 10 * 86_400_000),
        status: 'SENT',
        sentAt: new Date(),
        offerFileId: officialOfferFileId,
      },
    })

    await login(page, 'candidate@example.com')
    const offerResponse = await page.request.get(`/api/candidate/offers/${offer.id}`)
    expect(offerResponse.status()).toBe(200)
    expect((await offerResponse.json()).offer.offerFileId).toBe(officialOfferFileId)

    const download = await page.request.get(`/api/assets/download/${officialOfferFileId}`)
    expect(download.status()).toBe(200)
    expect(download.headers()['content-type']).toContain('application/pdf')
    expect(Buffer.from(await download.body()).subarray(0, 5).toString()).toBe('%PDF-')

    const proposedStartDate = new Date(Date.now() + 45 * 86_400_000)
    const clarification = await page.request.post(`/api/candidate/offers/${offer.id}/respond`, {
      data: {
        action: 'CLARIFY',
        candidateComment: 'Please confirm whether the proposed date is compatible with the induction schedule.',
        proposedStartDate: proposedStartDate.toISOString(),
      },
    })
    expect(clarification.status(), await clarification.text()).toBe(200)
    const clarifiedOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(clarifiedOffer.candidateProposedStartDate?.toISOString()).toBe(proposedStartDate.toISOString())
    expect(await prisma.messageThread.count({ where: { applicationId: application.id, category: 'OFFER_CLARIFICATION' } })).toBe(1)

    const signedOfferFileId = await uploadPdf(page, `signed-offer-${runId}.pdf`)
    const acceptance = await page.request.post(`/api/candidate/offers/${offer.id}/respond`, {
      headers: { 'Idempotency-Key': `accept-offer-${runId}` },
      data: {
        action: 'ACCEPT',
        signatureName: 'Demo Candidate',
        signedFileId: signedOfferFileId,
      },
    })
    expect(acceptance.status(), await acceptance.text()).toBe(200)
    const acceptanceBody = await acceptance.json()
    const acceptedOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    const acceptedApplication = await prisma.application.findUniqueOrThrow({ where: { id: application.id } })
    expect(acceptedOffer.status).toBe('ACCEPTED')
    expect(acceptedOffer.signedFileId).toBe(signedOfferFileId)
    expect(acceptedOffer.signatureMethod).toBe('TYPED_NAME_AND_SIGNED_UPLOAD')
    expect(acceptedApplication.internalStatus).toBe('OFFER_ACCEPTED')

    const preboardingId = acceptanceBody.preboardingId as string
    const policyInputs = [
      { method: 'ACKNOWLEDGE', data: {} },
      { method: 'TYPED_NAME', data: { signatureData: 'Demo Candidate' } },
      { method: 'DRAWN_SIGNATURE', data: { signatureData: 'data:image/png;base64,AA==' } },
      { method: 'UPLOAD_SIGNED', data: { signedFileId: signedOfferFileId } },
    ] as const
    const acknowledgements = []
    for (const [index, input] of policyInputs.entries()) {
      const policy = await prisma.policyDocument.create({
        data: {
          title: `${input.method} acceptance policy ${runId}`,
          category: index === 0 ? 'CODE_OF_CONDUCT' : index === 1 ? 'SAFEGUARDING' : index === 2 ? 'PSEA' : 'CONFIDENTIALITY',
          effectiveDate: new Date(),
          acknowledgementMethod: input.method,
        },
      })
      acknowledgements.push(await prisma.candidatePolicyAcknowledgement.create({
        data: {
          candidatePreboardingId: preboardingId,
          policyDocumentId: policy.id,
          policySnapshotJson: JSON.stringify({ title: policy.title, acknowledgementMethod: input.method }),
        },
      }))
    }

    for (const [index, acknowledgement] of acknowledgements.entries()) {
      const response = await page.request.post('/api/candidate/preboarding/actions', {
        data: { action: 'POLICY_SIGN', resourceId: acknowledgement.id, data: policyInputs[index].data },
      })
      expect(response.status(), `${policyInputs[index].method}: ${await response.text()}`).toBe(200)
      const saved = await prisma.candidatePolicyAcknowledgement.findUniqueOrThrow({ where: { id: acknowledgement.id } })
      expect(saved.status).toBe('SIGNED')
      expect(saved.signatureMethod).toBe(policyInputs[index].method)
    }

    const course = await prisma.course.create({
      data: {
        title: `All question types ${runId}`,
        description: 'Acceptance coverage for every documented quiz type',
        category: 'CORE',
        passMark: 100,
        allowedAttempts: 2,
        certificateEnabled: true,
      },
    })
    const questions = await Promise.all([
      prisma.courseQuizQuestion.create({
        data: { courseId: course.id, questionType: 'MCQ', question: 'Choose A', optionsJson: '["A","B"]', correctAnswerJson: '"A"', score: 1, displayOrder: 0 },
      }),
      prisma.courseQuizQuestion.create({
        data: { courseId: course.id, questionType: 'MULTISELECT', question: 'Choose A and B', optionsJson: '["A","B","C"]', correctAnswerJson: '["A","B"]', score: 1, displayOrder: 1 },
      }),
      prisma.courseQuizQuestion.create({
        data: { courseId: course.id, questionType: 'TRUEFALSE', question: 'The policy applies', optionsJson: '["True","False"]', correctAnswerJson: 'true', score: 1, displayOrder: 2 },
      }),
      prisma.courseQuizQuestion.create({
        data: { courseId: course.id, questionType: 'SHORTTEXT', question: 'Type safe', optionsJson: '[]', correctAnswerJson: '"safe"', score: 1, displayOrder: 3 },
      }),
    ])
    const candidateCourse = await prisma.candidateCourse.create({
      data: {
        candidatePreboardingId: preboardingId,
        courseId: course.id,
        courseSnapshotJson: JSON.stringify({
          title: course.title,
          passMark: course.passMark,
          allowedAttempts: course.allowedAttempts,
          certificateEnabled: course.certificateEnabled,
          quizQuestions: questions.map(({ id, score, correctAnswerJson }) => ({ id, score, correctAnswerJson })),
        }),
      },
    })
    const courseSubmit = await page.request.post('/api/candidate/preboarding/actions', {
      data: {
        action: 'COURSE_SUBMIT',
        resourceId: candidateCourse.id,
        data: {
          answers: {
            [questions[0].id]: 'A',
            [questions[1].id]: ['B', 'A'],
            [questions[2].id]: true,
            [questions[3].id]: 'safe',
          },
        },
      },
    })
    expect(courseSubmit.status(), await courseSubmit.text()).toBe(200)
    const completedCourse = await prisma.candidateCourse.findUniqueOrThrow({ where: { id: candidateCourse.id } })
    expect(completedCourse.status).toBe('COMPLETED')
    expect(completedCourse.score).toBe(100)
    expect(completedCourse.attempts).toBe(1)

    const certificate = await page.request.get(`/api/candidate/preboarding/courses/${candidateCourse.id}/certificate`)
    expect(certificate.status()).toBe(200)
    expect(certificate.headers()['content-type']).toContain('application/pdf')
    expect(Buffer.from(await certificate.body()).subarray(0, 5).toString()).toBe('%PDF-')
    await logout(page)

    await login(page, 'course.admin@frad.org')
    const courseAdminView = await page.request.get('/api/admin/configuration-builder?mode=courses')
    expect(courseAdminView.status()).toBe(200)
    const reset = await page.request.post('/api/admin/configuration-builder', {
      data: {
        action: 'RESET_COURSE_ATTEMPT',
        candidateCourseId: candidateCourse.id,
        reason: 'Acceptance test of an authorised attempt reset.',
      },
    })
    expect(reset.status(), await reset.text()).toBe(200)
    const resetCourse = await prisma.candidateCourse.findUniqueOrThrow({ where: { id: candidateCourse.id } })
    expect(resetCourse.status).toBe('ASSIGNED')
    expect(resetCourse.attempts).toBe(0)
    expect(await prisma.candidateCourseAttempt.count({ where: { candidateCourseId: candidateCourse.id } })).toBe(0)
    await logout(page)
  })
})
