import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshPreboardingProgress } from '@/lib/preboarding'
import { clientIp } from '@/lib/rate-limit'

const actionSchema = z.object({
  action: z.enum([
    'FORM_SAVE', 'FORM_SUBMIT', 'DOCUMENT_SUBMIT', 'POLICY_SIGN',
    'COURSE_SUBMIT', 'TASK_SUBMIT', 'INFO_ACKNOWLEDGE', 'MEETING_RESPOND',
  ]),
  resourceId: z.string().min(1),
  data: z.record(z.string(), z.any()).optional().default({}),
})

function answerMatches(actual: unknown, expectedJson: string) {
  try {
    const expected = JSON.parse(expectedJson)
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false
      const normalize = (values: unknown[]) => values.map((value) => String(value).trim().toLowerCase()).sort()
      return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected))
    }
    return JSON.stringify(actual) === JSON.stringify(expected)
  } catch {
    return false
  }
}

type CourseSnapshot = {
  allowedAttempts?: number
  passMark?: number
  quizQuestions?: Array<{ id: string; score: number; correctAnswerJson: string }>
}

type FormField = {
  name: string
  type?: string
  required?: boolean
  options?: string[]
}

function readFormFields(snapshotJson: string | null, liveSchemaJson: string): FormField[] {
  try {
    const snapshot = snapshotJson ? JSON.parse(snapshotJson) : null
    const schema = snapshot?.schemaJson ? JSON.parse(snapshot.schemaJson) : JSON.parse(liveSchemaJson)
    if (!Array.isArray(schema?.fields)) throw new Error('fields missing')
    return schema.fields.filter((field: unknown): field is FormField => {
      if (!field || typeof field !== 'object') return false
      return typeof (field as FormField).name === 'string' && Boolean((field as FormField).name.trim())
    })
  } catch {
    throw new AuthzError('Assigned form configuration is invalid; contact HR', 409)
  }
}

function validateFormResponses(responses: unknown, fields: FormField[], submitting: boolean) {
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    throw new AuthzError('Form responses must be an object', 400)
  }
  const values = responses as Record<string, unknown>
  const allowed = new Set(fields.map((field) => field.name))
  const unknown = Object.keys(values).find((name) => !allowed.has(name))
  if (unknown) throw new AuthzError(`Unknown form field: ${unknown}`, 400)
  for (const field of fields) {
    const value = values[field.name]
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
    if (submitting && field.required && empty) throw new AuthzError(`${field.name} is required`, 400)
    if (empty) continue
    const type = String(field.type || 'text').toLowerCase()
    if (['number', 'rating'].includes(type) && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new AuthzError(`${field.name} must be a number`, 400)
    }
    if (['yesno', 'boolean', 'checkbox', 'declaration'].includes(type) && typeof value !== 'boolean') {
      throw new AuthzError(`${field.name} must be true or false`, 400)
    }
    if (type === 'multiselect' && (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))) {
      throw new AuthzError(`${field.name} must contain selected options`, 400)
    }
    if (!['number', 'rating', 'yesno', 'boolean', 'checkbox', 'declaration', 'multiselect'].includes(type) && typeof value !== 'string') {
      throw new AuthzError(`${field.name} must be text`, 400)
    }
    if (typeof value === 'string' && value.length > 20_000) throw new AuthzError(`${field.name} is too long`, 400)
  }
  return values
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { action, resourceId, data } = await parseBody(request, actionSchema)
    const payload = data ?? {}
    let preboardingId = ''
    const ownership = { application: { candidate: { userId: user.userId } } }
    const resourceParents = await Promise.all([
      prisma.candidatePreboardingForm.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.candidateRequiredDocument.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.candidatePolicyAcknowledgement.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.candidateCourse.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.candidatePreboardingTask.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.candidateInformationItem.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
      prisma.preboardingMeeting.findFirst({ where: { id: resourceId, candidatePreboarding: ownership }, select: { candidatePreboarding: { select: { application: { select: { internalStatus: true } } } } } }),
    ])
    const parent = resourceParents.find(Boolean)
    if (parent?.candidatePreboarding.application.internalStatus === 'TRANSFERRED_TO_ERP') {
      throw new AuthzError('This recruitment file is closed after ERP transfer', 409)
    }

    if (action === 'FORM_SAVE' || action === 'FORM_SUBMIT') {
      const item = await prisma.candidatePreboardingForm.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
        include: { formTemplate: { select: { schemaJson: true } } },
      })
      if (!item) throw new AuthzError('Form not found', 404)
      if (['APPROVED', 'WAIVED'].includes(item.status)) throw new AuthzError('This form is locked', 409)
      const fields = readFormFields(item.templateSnapshotJson, item.formTemplate.schemaJson)
      const responses = validateFormResponses(payload.responses ?? {}, fields, action === 'FORM_SUBMIT')
      preboardingId = item.candidatePreboardingId
      await prisma.candidatePreboardingForm.update({
        where: { id: item.id },
        data: {
          responseJson: JSON.stringify(responses),
          status: action === 'FORM_SUBMIT' ? 'SUBMITTED' : 'IN_PROGRESS',
          submittedAt: action === 'FORM_SUBMIT' ? new Date() : null,
        },
      })
    } else if (action === 'DOCUMENT_SUBMIT') {
      const item = await prisma.candidateRequiredDocument.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
        include: { documentRequirement: true },
      })
      if (!item) throw new AuthzError('Document requirement not found', 404)
      if (['APPROVED', 'WAIVED'].includes(item.status)) throw new AuthzError('This approved document is locked', 409)
      const fileAssetId = String(payload.fileAssetId || '')
      const asset = await prisma.fileAsset.findFirst({ where: { id: fileAssetId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' } })
      if (!asset) throw new AuthzError('A clean uploaded file owned by you is required', 400)
      if (asset.sizeBytes > item.documentRequirement.maximumFileSize) throw new AuthzError('File exceeds this requirement’s size limit', 400)
      const allowed = item.documentRequirement.allowedFileTypes.toLowerCase().split(',').map((value) => value.trim())
      const extension = asset.originalName.split('.').pop()?.toLowerCase() || ''
      if (!allowed.includes(extension)) throw new AuthzError(`File must be one of: ${allowed.join(', ')}`, 400)
      const expiryDate = payload.expiryDate ? new Date(String(payload.expiryDate)) : null
      if (item.documentRequirement.expiryRequired && (!expiryDate || Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date())) throw new AuthzError('A future expiry date is required', 400)
      preboardingId = item.candidatePreboardingId
      await prisma.$transaction(async (tx) => {
        const sensitivityRank: Record<string, number> = { STANDARD: 0, CONFIDENTIAL: 1, RESTRICTED: 2 }
        const requiredSensitivity = item.documentRequirement.sensitivityClass
        if ((sensitivityRank[asset.sensitivityClass] ?? 0) < (sensitivityRank[requiredSensitivity] ?? 0)) {
          await tx.fileAsset.update({
            where: { id: asset.id },
            data: { sensitivityClass: requiredSensitivity },
          })
        }
        if (item.fileAssetId) await tx.candidateRequiredDocumentVersion.create({ data: { candidateRequiredDocumentId: item.id, versionNumber: item.versionNumber, fileAssetId: item.fileAssetId, expiryDate: item.expiryDate, status: item.status, submittedAt: item.submittedAt } })
        const updated = await tx.candidateRequiredDocument.updateMany({
          where: { id: item.id, versionNumber: item.versionNumber, status: { notIn: ['APPROVED', 'WAIVED'] } },
          data: { fileAssetId, expiryDate, status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null, versionNumber: { increment: 1 } },
        })
        if (updated.count !== 1) throw new AuthzError('Document changed; refresh and try again', 409)
      })
    } else if (action === 'POLICY_SIGN') {
      const item = await prisma.candidatePolicyAcknowledgement.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
        include: { policyDocument: true },
      })
      if (!item) throw new AuthzError('Policy acknowledgement not found', 404)
      let snapshot: { acknowledgementMethod?: string } | null = null
      try { snapshot = item.policySnapshotJson ? JSON.parse(item.policySnapshotJson) : null } catch { snapshot = null }
      const method = snapshot?.acknowledgementMethod || item.policyDocument.acknowledgementMethod || 'TYPED_NAME'
      if (!['ACKNOWLEDGE', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'UPLOAD_SIGNED'].includes(method)) throw new AuthzError('Policy signature configuration is invalid', 409)
      const signatureData = String(payload.signatureData || payload.typedName || '').trim()
      const signedFileId = String(payload.signedFileId || '')
      if (method === 'TYPED_NAME' && !signatureData) throw new AuthzError('Your typed legal name is required', 400)
      if (method === 'DRAWN_SIGNATURE' && (!signatureData.startsWith('data:image/png;base64,') || signatureData.length > 500_000)) throw new AuthzError('A valid drawn signature is required', 400)
      if (method === 'UPLOAD_SIGNED') {
        const asset = await prisma.fileAsset.findFirst({ where: { id: signedFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN', mimeType: 'application/pdf' } })
        if (!asset) throw new AuthzError('A clean signed PDF owned by you is required', 400)
      }
      preboardingId = item.candidatePreboardingId
      const trustedIp = clientIp(request)
      await prisma.candidatePolicyAcknowledgement.update({
        where: { id: item.id },
        data: { status: 'SIGNED', viewedAt: item.viewedAt ?? new Date(), acknowledgedAt: new Date(), signedAt: new Date(), signatureMethod: method, signatureData: signatureData || null, signedFileId: signedFileId || null, signatureIpAddress: trustedIp === 'unknown' ? null : trustedIp, signatureUserAgent: request.headers.get('user-agent') },
      })
    } else if (action === 'COURSE_SUBMIT') {
      const item = await prisma.candidateCourse.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
        include: { course: { include: { quizQuestions: true } } },
      })
      if (!item) throw new AuthzError('Course not found', 404)
      let snapshot: CourseSnapshot | null = null
      try { snapshot = item.courseSnapshotJson ? JSON.parse(item.courseSnapshotJson) as CourseSnapshot : null } catch { snapshot = null }
      const allowedAttempts = snapshot?.allowedAttempts ?? item.course.allowedAttempts
      const passMark = snapshot?.passMark ?? item.course.passMark
      const quizQuestions = Array.isArray(snapshot?.quizQuestions) ? snapshot.quizQuestions : item.course.quizQuestions
      if (item.attempts >= allowedAttempts) throw new AuthzError('No course attempts remain', 409)
      const answers = (payload.answers ?? {}) as Record<string, unknown>
      const possible = quizQuestions.reduce((sum, q) => sum + q.score, 0)
      const earned = quizQuestions.reduce((sum, q) => sum + (answerMatches(answers[q.id], q.correctAnswerJson) ? q.score : 0), 0)
      const score = possible === 0 ? 100 : Math.round((earned / possible) * 10000) / 100
      const passed = score >= passMark
      const attemptNumber = item.attempts + 1
      preboardingId = item.candidatePreboardingId
      await prisma.$transaction(async (tx) => {
        const updated = await tx.candidateCourse.updateMany({
          where: { id: item.id, attempts: item.attempts, status: { notIn: ['COMPLETED', 'WAIVED'] } },
          data: { attempts: { increment: 1 }, score, status: passed ? 'COMPLETED' : 'FAILED', startedAt: item.startedAt ?? new Date(), completedAt: passed ? new Date() : null },
        })
        if (updated.count !== 1) throw new AuthzError('Course attempt changed; refresh and try again', 409)
        await tx.candidateCourseAttempt.create({ data: { candidateCourseId: item.id, attemptNumber, submittedAt: new Date(), score, passed, answersJson: JSON.stringify(answers) } })
      })
    } else if (action === 'TASK_SUBMIT') {
      const item = await prisma.candidatePreboardingTask.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
        include: { taskTemplate: true },
      })
      if (!item) throw new AuthzError('Task not found', 404)
      if (['SUBMITTED', 'AWAITING_REVIEW', 'APPROVED', 'COMPLETED', 'WAIVED', 'CANCELLED'].includes(item.status)) {
        throw new AuthzError('This task can no longer be submitted', 409)
      }
      const comment = String(payload.comment || '').trim()
      const evidenceFileId = payload.evidenceFileId ? String(payload.evidenceFileId) : null
      if (item.taskTemplate.evidenceRequired && !evidenceFileId) throw new AuthzError('Upload supporting evidence before submitting this task', 400)
      if (evidenceFileId) {
        const ownedFile = await prisma.fileAsset.findFirst({ where: { id: evidenceFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' }, select: { id: true } })
        if (!ownedFile) throw new AuthzError('The supporting file is unavailable or has not passed safety checks', 400)
      }
      if (item.taskTemplate.dependencyJson) {
        let dependencies: string[] = []
        try { dependencies = JSON.parse(item.taskTemplate.dependencyJson) } catch { throw new AuthzError('Task dependency configuration is invalid', 409) }
        if (!Array.isArray(dependencies)) throw new AuthzError('Task dependency configuration is invalid', 409)
        const incomplete = await prisma.candidatePreboardingTask.count({ where: { candidatePreboardingId: item.candidatePreboardingId, taskTemplateId: { in: dependencies }, status: { notIn: ['COMPLETED', 'APPROVED', 'WAIVED'] } } })
        if (incomplete > 0) throw new AuthzError('Complete prerequisite tasks first', 409)
      }
      preboardingId = item.candidatePreboardingId
      await prisma.candidatePreboardingTask.update({
        where: { id: item.id },
        data: { candidateComment: comment || null, evidenceFileId, submittedAt: new Date(), completedAt: item.taskTemplate.reviewRequired ? null : new Date(), status: item.taskTemplate.reviewRequired ? 'SUBMITTED' : 'COMPLETED' },
      })
    } else if (action === 'INFO_ACKNOWLEDGE') {
      const item = await prisma.candidateInformationItem.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
      })
      if (!item) throw new AuthzError('Information item not found', 404)
      preboardingId = item.candidatePreboardingId
      await prisma.candidateInformationItem.update({ where: { id: item.id }, data: { acknowledgedAt: new Date() } })
    } else {
      const item = await prisma.preboardingMeeting.findFirst({
        where: { id: resourceId, candidatePreboarding: { application: { candidate: { userId: user.userId } } } },
      })
      if (!item) throw new AuthzError('Meeting not found', 404)
      if (['ATTENDED', 'MISSED', 'CANCELLED', 'WAIVED'].includes(item.status)) {
        throw new AuthzError('This meeting can no longer be changed by the candidate', 409)
      }
      const response = String(payload.response || '')
      if (!['CONFIRMED', 'DECLINED', 'RESCHEDULE_REQUESTED'].includes(response)) throw new AuthzError('Choose confirm, decline, or request another time', 400)
      preboardingId = item.candidatePreboardingId
      await prisma.preboardingMeeting.update({ where: { id: item.id }, data: { candidateResponse: response, status: response === 'CONFIRMED' ? 'CONFIRMED' : response === 'RESCHEDULE_REQUESTED' ? 'RESCHEDULE_REQUESTED' : item.status } })
    }

    if (preboardingId) await refreshPreboardingProgress(preboardingId)
    // Responses may contain identity, banking, health, family, signature, or
    // assessment data. Record the operation without making an audit-log copy.
    await logAudit({
      actorUserId: user.userId,
      action,
      resourceType: 'CandidatePreboardingItem',
      resourceId,
      newValue: { fieldsChanged: Object.keys(payload), preboardingId },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return authzResponse(err)
  }
}
