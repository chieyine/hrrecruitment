import { z } from 'zod'
import { AuthzError } from './errors'

/**
 * Parse and validate a request body against a Zod schema.
 * Throws AuthzError(400) with a readable message on failure so route handlers
 * can funnel it through authzResponse().
 */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = 1_000_000): Promise<T> {
  let json: unknown
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new AuthzError(`Request body exceeds the ${maxBytes}-byte limit`, 413)
    }
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
      throw new AuthzError(`Request body exceeds the ${maxBytes}-byte limit`, 413)
    }
    json = JSON.parse(raw)
  } catch (error) {
    if (error instanceof AuthzError) throw error
    throw new AuthzError('Request body must be valid JSON', 400)
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')
    throw new AuthzError(msg || 'Validation failed', 400)
  }
  return result.data
}

// ---- Reusable primitives (§46 General) ----
export const emailSchema = z.string().trim().toLowerCase().email('A valid email is required')
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'A valid phone number is required')
export const nonEmpty = (label = 'This field') => z.string().trim().min(1, `${label} is required`)
const bcryptSafePassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes')

export const boundedAnswerValueSchema = z.union([
  z.string().max(10_000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(2_000)).max(100),
  z.null(),
])

// ---- Auth (§10, §46.1) ----
export const registerSchema = z.object({
  legalFirstName: nonEmpty('First name'),
  lastName: nonEmpty('Last name'),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  password: bcryptSafePassword,
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Privacy notice consent is required' }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Terms agreement is required' }) }),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetPasswordSchema = z.object({
  token: nonEmpty('Reset token'),
  password: bcryptSafePassword,
})

// ---- Vacancy (§46.2) ----
export const vacancySchema = z
  .object({
    title: nonEmpty('Title').max(200),
    departmentId: nonEmpty('Department'),
    dutyStationId: nonEmpty('Duty station'),
    projectId: z.string().optional().nullable(),
    categoryId: nonEmpty('Vacancy category'),
    numberOfPositions: z.coerce.number().int().min(1, 'At least one position is required'),
    contractType: nonEmpty('Contract type'),
    contractDuration: z.string().optional().nullable(),
    reportingLine: z.string().optional().nullable(),
    summary: nonEmpty('Summary'),
    responsibilities: nonEmpty('Responsibilities'),
    essentialQualifications: nonEmpty('Essential qualifications'),
    desirableQualifications: z.string().optional().nullable(),
    desiredExperience: z.string().max(5000).optional().nullable(),
    languageRequirements: z.string().max(5000).optional().nullable(),
    technicalSkills: z.string().max(5000).optional().nullable(),
    behaviouralCompetencies: z.string().max(5000).optional().nullable(),
    safeguardingResponsibilities: z.string().max(5000).optional().nullable(),
    travelRequirement: z.string().max(2000).optional().nullable(),
    minimumExperienceYears: z.coerce.number().int().min(0).default(0),
    openingAt: z.coerce.date(),
    closingAt: z.coerce.date(),
    status: z.string().optional(),
  })
  .refine((v) => v.closingAt > v.openingAt, {
    message: 'Closing date must be after the opening date',
    path: ['closingAt'],
  })

// ---- Application stage (§42.2 handled separately) ----
export const stageChangeSchema = z.object({
  internalStatus: nonEmpty('Internal status'),
  reason: z.string().max(1000).optional(),
  lockVersion: z.coerce.number().int().positive('A current record version is required'),
})

// ---- Scorecard submission (§16) ----
export const scorecardSubmitSchema = z.object({
  applicationId: nonEmpty('applicationId'),
  scorecardTemplateId: z.string().optional(),
  criterionScores: z
    .array(
      z.object({
        criterionId: nonEmpty('criterionId'),
        score: z.coerce.number().min(0, 'Score cannot be negative'),
        comment: z.string().max(2000).optional(),
      })
    )
    .min(1, 'At least one criterion score is required')
    .max(100, 'Too many criterion scores')
    .superRefine((scores, context) => {
      const seen = new Set<string>()
      scores.forEach((score, index) => {
        if (seen.has(score.criterionId))
          context.addIssue({
            code: 'custom',
            path: [index, 'criterionId'],
            message: 'Each criterion may be scored only once',
          })
        seen.add(score.criterionId)
      })
    }),
})

// ---- Offer response (§22.4) ----
export const offerResponseSchema = z
  .object({
    action: z.enum(['ACCEPT', 'DECLINE', 'CLARIFY']),
    candidateComment: z.string().max(2000).optional(),
    signatureName: z.string().trim().max(200).optional(),
    signedFileId: z.string().uuid().optional(),
    proposedStartDate: z.coerce.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === 'ACCEPT' && !value.signatureName)
      context.addIssue({
        code: 'custom',
        path: ['signatureName'],
        message: 'Full legal name is required as your electronic signature',
      })
    if (value.action === 'CLARIFY' && !value.candidateComment?.trim() && !value.proposedStartDate)
      context.addIssue({
        code: 'custom',
        path: ['candidateComment'],
        message: 'Enter a clarification question or propose a start date',
      })
  })

// ---- Assessment submission (§18) ----
// Accept either an array of {questionId, answer} or a map of questionId -> answer.
export const assessmentSubmitSchema = z.object({
  answers: z
    .union([
      z.array(z.object({ questionId: nonEmpty('questionId'), answer: boundedAnswerValueSchema })).max(200),
      z
        .record(z.string(), boundedAnswerValueSchema)
        .refine((value) => Object.keys(value).length <= 200, 'Too many answers'),
    ])
    .optional(),
  autoSubmitted: z.boolean().optional(),
})

// ---- ERP transfer (§40) ----
export const erpTransferSchema = z.object({
  erpPersonnelNumber: nonEmpty('ERP Personnel Number').max(60),
  comment: z.string().max(2000).optional(),
  actualStartDate: z.coerce.date().optional(),
  createdInErpAt: z.coerce.date().optional(),
})

// ---- Admin generic CRUD ----
export const adminCreateSchema = z.object({
  entity: nonEmpty('entity'),
  data: z.record(z.string(), z.any()),
})
export const adminUpdateSchema = z.object({
  entity: nonEmpty('entity'),
  id: nonEmpty('id'),
  data: z.record(z.string(), z.any()),
})
export const adminDeleteSchema = z.object({
  entity: nonEmpty('entity'),
  id: nonEmpty('id'),
})
