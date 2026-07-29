import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { claimIdempotency, completeIdempotency, abandonIdempotency, type IdempotencyClaim } from '@/lib/idempotency'
import { evaluateApplicationEligibility } from '@/lib/eligibility'
import { logger } from '@/lib/logger'
import { createApplicationReference } from '@/lib/application-reference'

const schema = z
  .object({
    vacancyId: z.string().min(1),
    mode: z.enum(['DRAFT', 'SUBMIT']).default('SUBMIT'),
    declarationsAccepted: z.boolean().optional().default(false),
    answers: z
      .array(
        z.object({
          vacancyQuestionId: z.string().min(1),
          answer: z.union([
            z.string().max(20_000),
            z.number().finite(),
            z.boolean(),
            z.array(z.string().max(2_000)).max(100),
            z.null(),
          ]),
        })
      )
      .max(200)
      .default([]),
    documents: z
      .array(z.object({ requirementId: z.string().min(1), candidateDocumentId: z.string().min(1) }))
      .max(50)
      .default([]),
  })
  .superRefine((value, context) => {
    for (const [items, key] of [
      [value.answers, 'vacancyQuestionId'],
      [value.documents, 'requirementId'],
    ] as const) {
      const seen = new Set<string>()
      items.forEach((item: any, index) => {
        if (seen.has(item[key]))
          context.addIssue({
            code: 'custom',
            path: [items === value.answers ? 'answers' : 'documents', index, key],
            message: 'Duplicate entries are not allowed',
          })
        seen.add(item[key])
      })
    }
  })

function questionIsVisible(
  question: { conditionJson: string | null },
  questions: Array<{ id: string }>,
  answerMap: Map<string, unknown>
) {
  if (!question.conditionJson) return true
  try {
    const condition = JSON.parse(question.conditionJson) as { dependsOnIndex: number; operator: string; value: unknown }
    const dependency = questions[condition.dependsOnIndex]
    if (!dependency) return false
    const actual = answerMap.get(dependency.id)
    if (condition.operator === 'CONTAINS')
      return Array.isArray(actual)
        ? actual.map(String).includes(String(condition.value))
        : String(actual ?? '').includes(String(condition.value))
    if (condition.operator === 'NOT_EQUALS') return String(actual ?? '') !== String(condition.value)
    return String(actual ?? '') === String(condition.value)
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const vacancyId = new URL(request.url).searchParams.get('vacancyId')
    if (!vacancyId) {
      const applications = await prisma.application.findMany({
        where: { candidate: { userId: user.userId } },
        select: {
          id: true,
          candidateVisibleStatus: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
          vacancy: {
            select: {
              id: true,
              referenceNumber: true,
              title: true,
              department: { select: { name: true } },
              dutyStation: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ applications })
    }
    const application = await prisma.application.findFirst({
      where: { vacancyId, candidate: { userId: user.userId } },
      select: {
        id: true,
        internalStatus: true,
        answers: { select: { id: true, vacancyQuestionId: true, answerJson: true } },
        files: { select: { id: true, fileAssetId: true, vacancyQuestionId: true } },
      },
    })
    if (!application) return NextResponse.json({ application: null })
    const { internalStatus, ...safeApplication } = application
    return NextResponse.json({ application: { ...safeApplication, isDraft: internalStatus === 'DRAFT' } })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function POST(request: Request) {
  let claim: IdempotencyClaim | null = null
  try {
    const user = await requireUser()
    const parsed = await parseBody(request, schema)
    const { vacancyId, mode, answers, documents, declarationsAccepted } = parsed
    if (mode === 'SUBMIT') {
      if (!request.headers.get('idempotency-key')?.trim())
        throw new AuthzError('Idempotency-Key is required for application submission', 400)
      claim = await claimIdempotency({
        request,
        scope: 'APPLICATION_SUBMIT',
        actorUserId: user.userId,
        payload: parsed,
      })
      if (claim?.replay) return NextResponse.json(claim.body, { status: claim.statusCode })
    }
    let safeAnswers = answers ?? []
    const safeDocuments = documents ?? []
    const [account, profile, vacancy] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.userId }, select: { emailVerifiedAt: true } }),
      prisma.candidateProfile.findUnique({
        where: { userId: user.userId },
        include: { education: true, employment: true, licences: true, documents: true },
      }),
      prisma.vacancy.findUnique({
        where: { id: vacancyId },
        include: { questions: { orderBy: { displayOrder: 'asc' } }, requiredDocuments: true },
      }),
    ])
    if (!profile) throw new AuthzError('Candidate profile required', 400)
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.openingAt > new Date() || vacancy.closingAt <= new Date()) {
      throw new AuthzError('Vacancy is closed or not available', 400)
    }
    if (mode === 'SUBMIT' && !account?.emailVerifiedAt)
      throw new AuthzError('Verify your email before submitting an application', 403)
    if (mode === 'SUBMIT' && !declarationsAccepted) throw new AuthzError('Candidate declarations must be accepted', 400)

    const allowedQuestions = new Map(vacancy.questions.map((question) => [question.id, question]))
    const answerMap = new Map<string, unknown>()
    for (const answer of safeAnswers) {
      if (!allowedQuestions.has(answer.vacancyQuestionId))
        throw new AuthzError('An answer does not belong to this vacancy', 400)
      answerMap.set(answer.vacancyQuestionId, answer.answer)
    }
    const visibleQuestionIds = new Set(
      vacancy.questions
        .filter((question) => questionIsVisible(question, vacancy.questions, answerMap))
        .map((question) => question.id)
    )
    safeAnswers = safeAnswers.filter((answer) => visibleQuestionIds.has(answer.vacancyQuestionId))
    if (mode === 'SUBMIT') {
      const missing = vacancy.questions.filter((question) => {
        if (!visibleQuestionIds.has(question.id)) return false
        if (!question.required) return false
        const answer = answerMap.get(question.id)
        if (question.fieldType === 'DECLARATION') return answer !== true
        if (question.fieldType === 'MULTISELECT') return !Array.isArray(answer) || answer.length === 0
        return answer === null || answer === undefined || String(answer).trim() === ''
      })
      if (missing.length) throw new AuthzError(`Complete required question: ${missing[0].label}`, 400)
    }

    const fileQuestionAnswers = safeAnswers.filter(
      (answer) => allowedQuestions.get(answer.vacancyQuestionId)?.fieldType === 'FILE'
    )
    const ownedQuestionFiles = fileQuestionAnswers.length
      ? await prisma.fileAsset.findMany({
          where: {
            id: { in: fileQuestionAnswers.map((answer) => String(answer.answer)) },
            ownerUserId: user.userId,
            virusScanStatus: 'CLEAN',
          },
          select: { id: true },
        })
      : []
    const ownedQuestionFileIds = new Set(ownedQuestionFiles.map((file) => file.id))
    if (fileQuestionAnswers.some((answer) => !ownedQuestionFileIds.has(String(answer.answer))))
      throw new AuthzError('An application-question file is unavailable or unsafe', 400)

    const requirementMap = new Map(vacancy.requiredDocuments.map((requirement) => [requirement.id, requirement]))
    const selectedDocuments = new Map(
      safeDocuments.map((document) => [document.requirementId, document.candidateDocumentId])
    )
    for (const document of safeDocuments)
      if (!requirementMap.has(document.requirementId))
        throw new AuthzError('A document requirement does not belong to this vacancy', 400)
    if (mode === 'SUBMIT') {
      const missingDocument = vacancy.requiredDocuments.find(
        (requirement) => requirement.required && !selectedDocuments.has(requirement.id)
      )
      if (missingDocument) throw new AuthzError(`Attach required document: ${missingDocument.documentType}`, 400)
    }
    const ownedDocuments = safeDocuments.length
      ? await prisma.candidateDocument.findMany({
          where: {
            id: { in: safeDocuments.map((document) => document.candidateDocumentId) },
            candidateId: profile.id,
            fileAsset: { virusScanStatus: 'CLEAN' },
          },
          include: { fileAsset: true },
        })
      : []
    const ownedMap = new Map(ownedDocuments.map((document) => [document.id, document]))
    for (const selected of safeDocuments) {
      const document = ownedMap.get(selected.candidateDocumentId)
      const requirement = requirementMap.get(selected.requirementId)!
      if (!document) throw new AuthzError('A selected document is unavailable or unsafe', 400)
      if (document.documentType !== requirement.documentType)
        throw new AuthzError(`Select a ${requirement.documentType} document`, 400)
      if (requirement.expiryRequired && (!document.expiryDate || document.expiryDate <= new Date()))
        throw new AuthzError(`${requirement.documentType} requires a valid expiry date`, 400)
      if (document.fileAsset.sizeBytes > requirement.maximumFileSize)
        throw new AuthzError(`${requirement.documentType} exceeds the vacancy file-size limit`, 400)
      const allowed = requirement.allowedFileTypes
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
      const extension = document.fileAsset.originalName.split('.').pop()?.toLowerCase() || ''
      if (!allowed.includes(extension))
        throw new AuthzError(`${requirement.documentType} must be one of: ${allowed.join(', ')}`, 400)
    }

    const existing = await prisma.application.findUnique({
      where: { candidateId_vacancyId: { candidateId: profile.id, vacancyId } },
    })
    if (existing && existing.internalStatus !== 'DRAFT')
      throw new AuthzError('You have already submitted an application for this vacancy', 409)

    const eligibilityRules =
      mode === 'SUBMIT'
        ? await prisma.eligibilityRule.findMany({ where: { vacancyId, active: true }, orderBy: { createdAt: 'asc' } })
        : []
    const submissionReference = mode === 'SUBMIT' ? existing?.referenceNumber || createApplicationReference() : null
    const application = await prisma.$transaction(async (tx) => {
      let saved
      if (existing) {
        const changed = await tx.application.updateMany({
          where: { id: existing.id, internalStatus: 'DRAFT', lockVersion: existing.lockVersion },
          data:
            mode === 'SUBMIT'
              ? {
                  internalStatus: 'SUBMITTED',
                  candidateVisibleStatus: 'APPLICATION_RECEIVED',
                  submittedAt: new Date(),
                  referenceNumber: submissionReference,
                  lockVersion: { increment: 1 },
                }
              : { lockVersion: { increment: 1 } },
        })
        if (changed.count !== 1) throw new AuthzError('Application changed; refresh and try again', 409)
        saved = await tx.application.findUniqueOrThrow({ where: { id: existing.id } })
      } else {
        saved = await tx.application.create({
          data: {
            candidateId: profile.id,
            vacancyId,
            referenceNumber: submissionReference,
            internalStatus: mode === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT',
            candidateVisibleStatus: mode === 'DRAFT' ? 'APPLICATION_DRAFT' : 'APPLICATION_RECEIVED',
            submittedAt: mode === 'SUBMIT' ? new Date() : null,
          },
        })
      }
      await tx.applicationAnswer.deleteMany({ where: { applicationId: saved.id } })
      if (safeAnswers.length)
        await tx.applicationAnswer.createMany({
          data: safeAnswers.map((answer) => ({
            applicationId: saved.id,
            vacancyQuestionId: answer.vacancyQuestionId,
            answerJson: JSON.stringify(answer.answer),
          })),
        })
      await tx.applicationFile.deleteMany({ where: { applicationId: saved.id } })
      const applicationFiles = [
        ...safeDocuments.map((document) => ({
          applicationId: saved.id,
          fileAssetId: ownedMap.get(document.candidateDocumentId)!.fileAssetId,
          vacancyQuestionId: null,
          vacancyRequiredDocumentId: document.requirementId,
        })),
        ...fileQuestionAnswers.map((answer) => ({
          applicationId: saved.id,
          fileAssetId: String(answer.answer),
          vacancyQuestionId: answer.vacancyQuestionId,
        })),
      ]
      if (applicationFiles.length) await tx.applicationFile.createMany({ data: applicationFiles })
      if (mode === 'SUBMIT') {
        await tx.applicationProfileSnapshot.create({
          data: {
            applicationId: saved.id,
            profileJson: JSON.stringify({
              ...profile,
              _eligibilityRules: eligibilityRules,
              _minimumExperienceYears: vacancy.minimumExperienceYears,
              _declarationEvidence: {
                accepted: true,
                acceptedAt: new Date().toISOString(),
                noticeVersion: 'application-declarations-v1',
              },
            }),
          },
        })
        await tx.applicationStageHistory.create({
          data: {
            applicationId: saved.id,
            fromStatus: 'DRAFT',
            toStatus: 'SUBMITTED',
            changedBy: user.userId,
            reason: 'Candidate submission',
          },
        })
      }
      return saved
    })

    const responseBody = {
      success: true,
      applicationId: application.id,
      status: mode === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT',
    }
    await completeIdempotency(claim, 200, responseBody)
    await logAudit({
      actorUserId: user.userId,
      action: mode === 'SUBMIT' ? 'APPLICATION_SUBMITTED' : 'APPLICATION_DRAFT_SAVED',
      resourceType: 'Application',
      resourceId: application.id,
    }).catch((error) =>
      logger.error('Application audit write failed after commit', {
        applicationId: application.id,
        error: error instanceof Error ? error.message : String(error),
      })
    )
    if (mode === 'SUBMIT') {
      await evaluateApplicationEligibility(application.id).catch(async (error) => {
        // A screening-engine failure must be visible and recoverable rather
        // than silently treating the application as evaluated.
        await prisma.application
          .update({
            where: { id: application.id },
            data: { eligibilityResult: 'REQUIRES_HUMAN_REVIEW' },
          })
          .catch(() => undefined)
        logger.error('Eligibility evaluation failed; manual review required', {
          applicationId: application.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
      await createNotification({
        userId: user.userId,
        type: 'APPLICATION_RECEIVED',
        title: 'Application received',
        body: `Your application for ${vacancy.title} (${vacancy.referenceNumber}) has been received.`,
      }).catch((error) =>
        logger.error('Application confirmation enqueue failed', {
          applicationId: application.id,
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
    return NextResponse.json(responseBody)
  } catch (err) {
    await abandonIdempotency(claim)
    return authzResponse(err)
  }
}
