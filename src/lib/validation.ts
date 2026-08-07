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
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Privacy notice acknowledgement is required' }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Terms agreement is required' }) }),
  nextPath: z
    .string()
    .max(2_000)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Invalid return path')
    .optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  nextPath: z
    .string()
    .max(2_000)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Invalid return path')
    .optional(),
})
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

    // End_to_End.md §6 vacancy record fields
    staffingRequestId: z.string().optional().nullable(),
    grade: z.string().trim().max(40).optional().nullable(),
    timeZone: z.string().trim().max(64).default('Africa/Lagos'),
    salaryDisclosure: z.enum(['HIDDEN', 'RANGE', 'EXACT']).default('HIDDEN'),
    salaryRangeMinimum: z.coerce.number().nonnegative().optional().nullable(),
    salaryRangeMaximum: z.coerce.number().nonnegative().optional().nullable(),
    salaryCurrency: z.string().trim().length(3).toUpperCase().default('NGN'),
    safeguardingClassification: z.enum(['STANDARD', 'ELEVATED', 'HIGH']).default('STANDARD'),
    recruitmentContactName: z.string().trim().max(200).optional().nullable(),
    recruitmentContactEmail: emailSchema.optional().nullable(),
    // §28.8 internal vacancies, §28.7 emergency recruitment, §28.3 anonymised review
    audience: z.enum(['PUBLIC', 'INTERNAL', 'BOTH']).default('PUBLIC'),
    emergencyRecruitment: z.boolean().default(false),
    emergencyJustification: z.string().trim().max(2000).optional().nullable(),
    anonymisedReview: z.boolean().default(false),
    anonymisedFields: z.array(z.string().max(40)).max(20).optional(),
  })
  .refine((v) => v.closingAt > v.openingAt, {
    message: 'Closing date must be after the opening date',
    path: ['closingAt'],
  })
  .superRefine((value, context) => {
    // A disclosed range has to be a range, otherwise the advert misleads.
    if (value.salaryDisclosure === 'RANGE') {
      if (value.salaryRangeMinimum === null || value.salaryRangeMinimum === undefined)
        context.addIssue({ code: 'custom', path: ['salaryRangeMinimum'], message: 'Enter the minimum salary' })
      if (value.salaryRangeMaximum === null || value.salaryRangeMaximum === undefined)
        context.addIssue({ code: 'custom', path: ['salaryRangeMaximum'], message: 'Enter the maximum salary' })
      if (
        value.salaryRangeMinimum != null &&
        value.salaryRangeMaximum != null &&
        value.salaryRangeMaximum < value.salaryRangeMinimum
      )
        context.addIssue({
          code: 'custom',
          path: ['salaryRangeMaximum'],
          message: 'The maximum must not be below the minimum',
        })
    }
    // §28.7 an accelerated route still has to say why it was used.
    if (value.emergencyRecruitment && !value.emergencyJustification?.trim())
      context.addIssue({
        code: 'custom',
        path: ['emergencyJustification'],
        message: 'Emergency recruitment requires a justification',
      })
  })

// ---- Staffing request (End_to_End.md §5.1) ----
export const staffingRequestSchema = z
  .object({
    positionTitle: nonEmpty('Position title').max(200),
    departmentId: nonEmpty('Department'),
    projectId: z.string().optional().nullable(),
    dutyStationId: nonEmpty('Duty station'),
    numberOfPositions: z.coerce.number().int().min(1, 'At least one position is required').max(500),
    isReplacement: z.boolean().default(false),
    previousHolder: z.string().trim().max(200).optional().nullable(),
    recruitmentReason: nonEmpty('Reason for recruitment').max(4000),
    reportingLine: nonEmpty('Proposed reporting line').max(300),

    contractType: nonEmpty('Contract type').max(60),
    contractDurationMonths: z.coerce.number().int().min(0).max(600).optional().nullable(),
    expectedStartDate: z.coerce.date(),
    jobGrade: nonEmpty('Job grade').max(40),
    urgency: z.enum(['STANDARD', 'HIGH', 'EMERGENCY']).default('STANDARD'),

    budgetLine: nonEmpty('Budget line').max(120),
    fundingSource: z.enum(['GRANT', 'UNRESTRICTED', 'CORE', 'OTHER']),
    fundingEndDate: z.coerce.date().optional().nullable(),
    proposedSalaryCeiling: z.string().trim().max(120).optional().nullable(),
    donorRestrictions: z.string().trim().max(2000).optional().nullable(),

    jobDescriptionFileId: z.string().uuid().optional().nullable(),
    requiredQualifications: nonEmpty('Required technical qualifications').max(4000),
    requiredExperience: nonEmpty('Required experience').max(4000),
    requiredLanguages: z.string().trim().max(1000).optional().nullable(),
    safeguardingSensitivity: z.enum(['STANDARD', 'ELEVATED', 'HIGH']).default('STANDARD'),
    proposedAssessmentMethod: z.string().trim().max(2000).optional().nullable(),
    proposedPanel: z.string().trim().max(2000).optional().nullable(),

    hiringManagerName: nonEmpty('Hiring manager name').max(200),
    hiringManagerEmail: emailSchema,
    hiringManagerPhone: phoneSchema.optional().or(z.literal('')).nullable(),
  })
  .superRefine((value, context) => {
    // §5.1 A replacement must name whoever held the post, otherwise the
    // establishment record cannot be reconciled.
    if (value.isReplacement && !value.previousHolder?.trim())
      context.addIssue({
        code: 'custom',
        path: ['previousHolder'],
        message: 'Name the previous holder of a replacement position',
      })
    // Grant funding without an end date cannot be checked against the contract.
    if (value.fundingSource === 'GRANT' && !value.fundingEndDate)
      context.addIssue({
        code: 'custom',
        path: ['fundingEndDate'],
        message: 'Grant-funded positions require a funding end date',
      })
    if (value.fundingEndDate && value.fundingEndDate <= value.expectedStartDate)
      context.addIssue({
        code: 'custom',
        path: ['fundingEndDate'],
        message: 'Funding must extend beyond the expected start date',
      })
  })

// ---- Budget Holder funding confirmation (§3.7, §17) ----
export const fundingConfirmationSchema = z
  .object({
    decision: z.enum(['CONFIRMED', 'REJECTED', 'RETURNED']),
    budgetLine: z.string().trim().max(120).optional().nullable(),
    fundingSource: z.enum(['GRANT', 'UNRESTRICTED', 'CORE', 'OTHER']).optional().nullable(),
    fundingStartDate: z.coerce.date().optional().nullable(),
    fundingEndDate: z.coerce.date().optional().nullable(),
    salaryCeilingAmount: z.coerce.number().nonnegative().max(1_000_000_000).optional().nullable(),
    salaryCeilingCurrency: z.string().trim().length(3).toUpperCase().optional().nullable(),
    maximumRecruitmentCost: z.coerce.number().nonnegative().max(1_000_000_000).optional().nullable(),
    grantFunded: z.boolean().default(false),
    donorApprovalRequired: z.boolean().default(false),
    donorApprovalReference: z.string().trim().max(200).optional().nullable(),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, context) => {
    // A confirmation is meaningless without the envelope it confirms (§3.7).
    if (value.decision === 'CONFIRMED') {
      if (!value.budgetLine?.trim())
        context.addIssue({ code: 'custom', path: ['budgetLine'], message: 'Confirm the applicable budget line' })
      if (value.salaryCeilingAmount === null || value.salaryCeilingAmount === undefined)
        context.addIssue({
          code: 'custom',
          path: ['salaryCeilingAmount'],
          message: 'Confirm the salary or consultancy ceiling',
        })
      if (!value.fundingEndDate)
        context.addIssue({ code: 'custom', path: ['fundingEndDate'], message: 'Confirm the funding period end' })
      if (value.donorApprovalRequired && !value.donorApprovalReference?.trim())
        context.addIssue({
          code: 'custom',
          path: ['donorApprovalReference'],
          message: 'Record the donor approval reference',
        })
    }
    if (value.decision !== 'CONFIRMED' && !value.comment?.trim())
      context.addIssue({ code: 'custom', path: ['comment'], message: 'A reason is required for this decision' })
    if (value.fundingStartDate && value.fundingEndDate && value.fundingEndDate <= value.fundingStartDate)
      context.addIssue({
        code: 'custom',
        path: ['fundingEndDate'],
        message: 'Funding end must be after the funding start',
      })
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
    declarationAccepted: z.boolean().optional(),
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
    if (value.action === 'ACCEPT' && value.declarationAccepted !== true)
      context.addIssue({
        code: 'custom',
        path: ['declarationAccepted'],
        message: 'Confirm that you have read and accept the offer',
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
  reason: z.string().trim().min(10).max(1000),
})
