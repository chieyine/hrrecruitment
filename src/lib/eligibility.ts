import { prisma } from './prisma'
import { logger } from './logger'
import {
  evaluateLonglist,
  type LonglistCandidateFacts,
  type LonglistRule,
  type LonglistOutcome,
} from './longlisting-rules'

/**
 * Longlisting execution (End_to_End.md §11.3).
 *
 * Rule logic lives in `longlisting-rules.ts` and is pure. This module is only
 * responsible for assembling the facts, persisting the evaluation, and placing
 * the application into the right group.
 *
 * Facts are read from the submission snapshot wherever one exists. A candidate
 * who edits their profile after applying must not change the basis on which
 * their application was assessed.
 */

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The shape every evaluation needs. Declared once so the single-application and
 * batched paths cannot drift apart in what they load.
 */
const EVALUATION_INCLUDE = {
  vacancy: {
    select: {
      id: true,
      dutyStation: { select: { name: true, state: true } },
      requiredDocuments: { select: { documentType: true, required: true } },
    },
  },
  candidate: {
    include: {
      education: true,
      employment: true,
      licences: true,
      certifications: true,
      skills: true,
      languages: true,
      documents: { select: { documentType: true, status: true } },
    },
  },
  answers: true,
  files: { select: { vacancyQuestionId: true } },
  snapshots: { orderBy: { createdAt: 'desc' as const }, take: 1 },
} as const

type ApplicationForEvaluation = NonNullable<Awaited<ReturnType<typeof loadApplication>>>

function loadApplication(applicationId: string) {
  return prisma.application.findUnique({ where: { id: applicationId }, include: EVALUATION_INCLUDE })
}

/**
 * Load a page of applications with everything an evaluation needs.
 *
 * A run used to call `loadApplication` per application, which meant one deep
 * query per applicant — thousands of round trips on a high-volume vacancy
 * (§28.16). Prisma expands this into a bounded number of queries per page
 * regardless of how many applications the page holds.
 */
function loadApplicationPage(vacancyId: string, take: number, cursor?: string) {
  return prisma.application.findMany({
    where: { vacancyId, internalStatus: { notIn: ['DRAFT', 'CANCELLED'] } },
    include: EVALUATION_INCLUDE,
    orderBy: { id: 'asc' },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })
}

/**
 * Build the fact set. Snapshot data wins over live profile data so a run stays
 * reproducible; where a snapshot predates a field, the live value is used.
 */
function buildFacts(application: ApplicationForEvaluation): LonglistCandidateFacts {
  const snapshot = application.snapshots[0]
    ? parseJson<Record<string, any>>(application.snapshots[0].profileJson, {})
    : {}

  const education = Array.isArray(snapshot.education)
    ? snapshot.education.map((item: any) => ({
        qualification: String(item.qualification ?? ''),
        fieldOfStudy: String(item.fieldOfStudy ?? ''),
        completionYear: Number.isFinite(Number(item.completionYear)) ? Number(item.completionYear) : null,
      }))
    : application.candidate.education.map((item) => ({
        qualification: item.qualification,
        fieldOfStudy: item.fieldOfStudy,
        completionYear: item.completionYear,
      }))

  const employmentRows =
    Array.isArray(snapshot.employment)
      ? snapshot.employment.map((item: any) => ({
          employer: String(item.employer ?? ''),
          jobTitle: String(item.jobTitle ?? ''),
          employmentType: String(item.employmentType ?? ''),
          startDate: toDate(item.startDate),
          endDate: toDate(item.endDate),
          responsibilities: item.responsibilities ?? null,
          sector: item.sector ?? null,
        }))
      : application.candidate.employment.map((item) => ({
          employer: item.employer,
          jobTitle: item.jobTitle,
          employmentType: item.employmentType,
          startDate: item.startDate,
          endDate: item.endDate,
          responsibilities: item.responsibilities,
          sector: null,
        }))
  const employment: LonglistCandidateFacts['employment'] = employmentRows
    .filter((item) => item.startDate instanceof Date)
    .map((item) => ({
      ...item,
      startDate: item.startDate as Date,
      responsibilities: item.responsibilities == null ? null : String(item.responsibilities),
      sector: item.sector == null ? null : String(item.sector),
    }))

  const licences = Array.isArray(snapshot.licences)
    ? snapshot.licences.map((item: any) => ({
        professionalBody: String(item.professionalBody ?? ''),
        licenceType: String(item.licenceType ?? ''),
        verificationStatus: String(item.verificationStatus ?? 'UNVERIFIED'),
        expiryDate: toDate(item.expiryDate),
      }))
    : application.candidate.licences.map((item) => ({
        professionalBody: item.professionalBody,
        licenceType: item.licenceType,
        verificationStatus: item.verificationStatus,
        expiryDate: item.expiryDate,
      }))

  const certifications = Array.isArray(snapshot.certifications)
    ? snapshot.certifications.map((item: any) => ({
        name: String(item.name ?? ''),
        issuingBody: String(item.issuingBody ?? ''),
        expiryDate: toDate(item.expiryDate),
      }))
    : application.candidate.certifications.map((item) => ({
        name: item.name,
        issuingBody: item.issuingBody,
        expiryDate: item.expiryDate,
      }))

  const skills = Array.isArray(snapshot.skills)
    ? snapshot.skills.map((item: any) => ({
        name: String(item.name ?? ''),
        category: item.category ?? null,
        proficiency: item.proficiency ?? null,
      }))
    : application.candidate.skills.map((item) => ({
        name: item.name,
        category: item.category,
        proficiency: item.proficiency,
      }))

  const languages = Array.isArray(snapshot.languages)
    ? snapshot.languages.map((item: any) => ({
        language: String(item.language ?? ''),
        speakingLevel: String(item.speakingLevel ?? ''),
        readingLevel: String(item.readingLevel ?? ''),
        writingLevel: String(item.writingLevel ?? ''),
      }))
    : application.candidate.languages.map((item) => ({
        language: item.language,
        speakingLevel: item.speakingLevel,
        readingLevel: item.readingLevel,
        writingLevel: item.writingLevel,
      }))

  const answers = new Map<string, unknown>(
    application.answers.map((answer) => [answer.vacancyQuestionId, parseJson<unknown>(answer.answerJson, answer.answerJson)])
  )

  // Documents count as supplied whether they came from the reusable library or
  // were uploaded against a question on this application.
  const documents = new Set<string>()
  for (const document of application.candidate.documents)
    if (document.status !== 'REJECTED') documents.add(document.documentType)
  for (const file of application.files) if (file.vacancyQuestionId) documents.add(file.vacancyQuestionId)

  const preferredDutyLocations = parseJson<string[]>(
    snapshot.preferredDutyLocationsJson ?? application.candidate.preferredDutyLocationsJson,
    []
  )

  return {
    education,
    employment,
    licences,
    certifications,
    skills,
    languages,
    answers,
    documents,
    earliestStartDate: toDate(snapshot.earliestStartDate ?? application.candidate.earliestStartDate),
    willingnessToRelocate: Boolean(snapshot.willingnessToRelocate ?? application.candidate.willingnessToRelocate),
    preferredDutyLocations: Array.isArray(preferredDutyLocations) ? preferredDutyLocations.map(String) : [],
    workAuthorisation: (snapshot.workAuthorisation ?? snapshot.nationality ?? application.candidate.nationality) || null,
  }
}

/** Rules come from the snapshot when one exists, so a run is reproducible. */
async function resolveRules(application: ApplicationForEvaluation): Promise<LonglistRule[]> {
  const snapshot = application.snapshots[0]
    ? parseJson<Record<string, any>>(application.snapshots[0].profileJson, {})
    : {}
  const raw = Array.isArray(snapshot._eligibilityRules)
    ? snapshot._eligibilityRules
    : await prisma.eligibilityRule.findMany({
        where: { vacancyId: application.vacancyId, active: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      })

  return raw.map((rule: any) => ({
    id: String(rule.id),
    ruleType: String(rule.ruleType),
    classification: String(rule.classification ?? 'MANDATORY_KNOCKOUT'),
    label: String(rule.label ?? rule.ruleType),
    field: rule.field ?? null,
    operator: String(rule.operator ?? 'GTE'),
    expected: parseJson<unknown>(rule.expectedJson, rule.expectedJson),
    failureMessage: String(rule.failureMessage ?? 'Requirement not met'),
    weight: Number(rule.weight ?? 0),
  }))
}

/**
 * §11.3 step 1 — an application that is missing mandatory documents or answers
 * is incomplete, and incompleteness is reported rather than scored.
 */
function completenessOutcome(application: ApplicationForEvaluation, facts: LonglistCandidateFacts): LonglistOutcome | null {
  if (application.internalStatus === 'WITHDRAWN') return 'WITHDRAWN'
  if (application.internalStatus === 'DRAFT') return 'INCOMPLETE_APPLICATION'
  const missingDocument = application.vacancy.requiredDocuments
    .filter((document) => document.required)
    .some((document) => ![...facts.documents].some((held) => held.includes(document.documentType)))
  if (missingDocument) return 'INCOMPLETE_APPLICATION'
  return null
}

export interface EvaluateOptions {
  longlistRunId?: string
  /** Injected in tests so results are deterministic. */
  now?: Date
}

/**
 * Decide an already-loaded application. Pure apart from the rule fallback, so a
 * batch can reuse one rule set across every application on a vacancy.
 */
function decideApplication(
  application: ApplicationForEvaluation,
  rules: LonglistRule[],
  now: Date
) {
  const facts = buildFacts(application)
  const incomplete = completenessOutcome(application, facts)
  const decision = incomplete
    ? { outcome: incomplete, results: [], eligibilityScore: null, maximumScore: null, decidingRuleId: null }
    : evaluateLonglist(rules, facts, now)

  return {
    applicationId: application.id,
    longlistRunId: null as string | null,
    ruleVersionJson: JSON.stringify(
      rules.map((rule) => ({ id: rule.id, ruleType: rule.ruleType, classification: rule.classification }))
    ),
    resultJson: JSON.stringify(decision.results),
    eligibilityScore: decision.eligibilityScore,
    maximumScore: decision.maximumScore,
    suggestedOutcome: decision.outcome,
    originalOutcome: decision.outcome,
    decidingRuleId: decision.decidingRuleId,
  }
}

/**
 * Evaluate one application and record the result. Returns the persisted
 * evaluation. The caller decides whether to also move the application's stage.
 */
export async function evaluateApplicationEligibility(applicationId: string, options: EvaluateOptions = {}) {
  const application = await loadApplication(applicationId)
  if (!application) throw new Error('Application not found')

  const rules = await resolveRules(application)
  const data = decideApplication(application, rules, options.now ?? new Date())

  return prisma.eligibilityEvaluation.create({
    data: { ...data, longlistRunId: options.longlistRunId ?? null },
  })
}

/** §11.4 outcome -> the application stage it implies. */
const OUTCOME_TO_STAGE: Partial<Record<LonglistOutcome, string>> = {
  AUTOMATICALLY_ELIGIBLE: 'LONGLISTED',
  AUTOMATICALLY_INELIGIBLE: 'INELIGIBLE',
}

/**
 * §11.3 Run automatic longlisting across a vacancy and produce the §11.8
 * summary. Applications are only moved once a run is confirmed (see
 * `confirmLonglistRun`), so the proposed longlist stays reviewable.
 */
export async function runLonglisting(input: {
  vacancyId: string
  startedBy: string
  trigger: 'DEADLINE_CLOSE' | 'ON_ARRIVAL' | 'MANUAL' | 'RERUN'
  now?: Date
}) {
  const now = input.now ?? new Date()
  const rules = await prisma.eligibilityRule.findMany({
    where: { vacancyId: input.vacancyId, active: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  })

  // Any earlier unconfirmed run is superseded: only one proposal is live.
  await prisma.longlistRun.updateMany({
    where: { vacancyId: input.vacancyId, status: { in: ['IN_PROGRESS', 'AWAITING_CONFIRMATION'] } },
    data: { status: 'SUPERSEDED' },
  })

  const run = await prisma.longlistRun.create({
    data: {
      vacancyId: input.vacancyId,
      trigger: input.trigger,
      status: 'IN_PROGRESS',
      startedBy: input.startedBy,
      ruleSnapshotJson: JSON.stringify(
        rules.map((rule) => ({
          id: rule.id,
          ruleType: rule.ruleType,
          classification: rule.classification,
          label: rule.label,
          expectedJson: rule.expectedJson,
          weight: rule.weight.toString(),
          version: rule.version,
        }))
      ),
    },
  })

  // §11.4 duplicate detection: the same person appearing twice on one vacancy.
  // Resolved with one grouped query rather than by loading every application.
  const duplicateCandidates = await prisma.application.groupBy({
    by: ['candidateId'],
    where: { vacancyId: input.vacancyId, internalStatus: { notIn: ['DRAFT', 'CANCELLED'] } },
    _count: { _all: true },
    having: { candidateId: { _count: { gt: 1 } } },
  })
  const duplicateCandidateIds = new Set(duplicateCandidates.map((row) => row.candidateId))
  const firstApplicationByCandidate = new Map<string, string>()

  const counters: Record<LonglistOutcome, number> = {
    AUTOMATICALLY_ELIGIBLE: 0,
    AUTOMATICALLY_INELIGIBLE: 0,
    REQUIRES_REVIEW: 0,
    DUPLICATE_APPLICATION: 0,
    INCOMPLETE_APPLICATION: 0,
    WITHDRAWN: 0,
  }
  const reasonDistribution: Record<string, number> = {}

  // Rules are resolved once for the whole run. Every application on a vacancy is
  // assessed against the same approved set, so re-reading them per applicant was
  // pure overhead.
  const runRules: LonglistRule[] = rules.map((rule) => ({
    id: rule.id,
    ruleType: rule.ruleType,
    classification: rule.classification,
    label: rule.label,
    field: rule.field,
    operator: rule.operator,
    expected: parseJson<unknown>(rule.expectedJson, rule.expectedJson),
    failureMessage: rule.failureMessage,
    weight: Number(rule.weight),
  }))

  const PAGE_SIZE = 200
  let cursor: string | undefined
  let total = 0

  for (;;) {
    const page = await loadApplicationPage(input.vacancyId, PAGE_SIZE, cursor)
    if (!page.length) break
    total += page.length

    const rows: Array<ReturnType<typeof decideApplication>> = []

    for (const application of page) {
      try {
        // The first application from a candidate is assessed normally; any
        // later one on the same vacancy is a duplicate.
        if (duplicateCandidateIds.has(application.candidateId)) {
          const first = firstApplicationByCandidate.get(application.candidateId)
          if (first && first !== application.id) {
            rows.push({
              applicationId: application.id,
              longlistRunId: run.id,
              ruleVersionJson: '[]',
              resultJson: '[]',
              eligibilityScore: null,
              maximumScore: null,
              suggestedOutcome: 'DUPLICATE_APPLICATION',
              originalOutcome: 'DUPLICATE_APPLICATION',
              decidingRuleId: null,
            })
            counters.DUPLICATE_APPLICATION += 1
            continue
          }
          if (!first) firstApplicationByCandidate.set(application.candidateId, application.id)
        }

        // A snapshot may pin a different rule version for an individual
        // application; fall back to the run-wide set when it does not.
        const snapshot = application.snapshots[0]
          ? parseJson<Record<string, any>>(application.snapshots[0].profileJson, {})
          : {}
        const applicationRules = Array.isArray(snapshot._eligibilityRules)
          ? await resolveRules(application)
          : runRules

        const decision = decideApplication(application, applicationRules, now)
        decision.longlistRunId = run.id
        rows.push(decision)

        const outcome = decision.suggestedOutcome as LonglistOutcome
        counters[outcome] = (counters[outcome] ?? 0) + 1
        if (decision.decidingRuleId)
          reasonDistribution[decision.decidingRuleId] = (reasonDistribution[decision.decidingRuleId] ?? 0) + 1
      } catch (error) {
        // One unparseable application must not abandon the whole run. It is
        // recorded as needing review, which is the safe direction.
        logger.error('Longlisting evaluation failed for an application', {
          applicationId: application.id,
          error: error instanceof Error ? error.message : String(error),
        })
        rows.push({
          applicationId: application.id,
          longlistRunId: run.id,
          ruleVersionJson: '[]',
          resultJson: JSON.stringify([{ error: 'EVALUATION_FAILED' }]),
          eligibilityScore: null,
          maximumScore: null,
          suggestedOutcome: 'REQUIRES_REVIEW',
          originalOutcome: 'REQUIRES_REVIEW',
          decidingRuleId: null,
        })
        counters.REQUIRES_REVIEW += 1
      }
    }

    // One insert per page rather than one per application.
    if (rows.length) await prisma.eligibilityEvaluation.createMany({ data: rows })

    if (page.length < PAGE_SIZE) break
    cursor = page[page.length - 1].id
  }

  const incomplete = counters.INCOMPLETE_APPLICATION

  return prisma.longlistRun.update({
    where: { id: run.id },
    data: {
      status: 'AWAITING_CONFIRMATION',
      completedAt: new Date(),
      totalApplications: total,
      completeApplications: total - incomplete,
      incompleteApplications: incomplete,
      automaticallyEligible: counters.AUTOMATICALLY_ELIGIBLE,
      automaticallyIneligible: counters.AUTOMATICALLY_INELIGIBLE,
      requiresReview: counters.REQUIRES_REVIEW,
      duplicateApplications: counters.DUPLICATE_APPLICATION,
      withdrawnApplications: counters.WITHDRAWN,
      reasonDistributionJson: JSON.stringify(reasonDistribution),
    },
  })
}

/**
 * §11.8 Confirming a run is the act that produces the longlist. Only then do
 * applications move, and only where a human decision has not already overridden
 * the automatic outcome (§11.6).
 */
export async function confirmLonglistRun(input: {
  runId: string
  confirmedBy: string
  note?: string | null
  /**
   * §28.10 Written inside the confirmation transaction. If the signature cannot
   * be captured the whole confirmation rolls back, so a longlist can never be
   * declared without a signed approval record behind it.
   */
  sign?: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], moved: number) => Promise<unknown>
}) {
  const run = await prisma.longlistRun.findUnique({
    where: { id: input.runId },
    include: {
      evaluations: {
        select: {
          id: true,
          applicationId: true,
          suggestedOutcome: true,
          humanDecision: true,
        },
      },
    },
  })
  if (!run) throw new Error('Longlist run not found')
  if (run.status === 'CONFIRMED') throw new Error('This longlist run is already confirmed')
  if (run.status === 'SUPERSEDED') throw new Error('This longlist run has been superseded by a newer run')

  // Every exception must be dealt with before the longlist can be declared.
  const outstanding = run.evaluations.filter(
    (evaluation) => evaluation.suggestedOutcome === 'REQUIRES_REVIEW' && !evaluation.humanDecision
  )
  if (outstanding.length)
    throw new Error(`${outstanding.length} application(s) still require exception review before confirmation`)

  const moves: Array<{ applicationId: string; toStatus: string }> = []
  for (const evaluation of run.evaluations) {
    const effective = evaluation.humanDecision
      ? evaluation.humanDecision === 'ELIGIBLE'
        ? 'AUTOMATICALLY_ELIGIBLE'
        : evaluation.humanDecision === 'INELIGIBLE'
          ? 'AUTOMATICALLY_INELIGIBLE'
          : null
      : (evaluation.suggestedOutcome as LonglistOutcome)
    const target = effective ? OUTCOME_TO_STAGE[effective as LonglistOutcome] : null
    if (target) moves.push({ applicationId: evaluation.applicationId, toStatus: target })
  }

  await prisma.$transaction(async (tx) => {
    for (const move of moves) {
      const application = await tx.application.findUnique({
        where: { id: move.applicationId },
        select: { internalStatus: true },
      })
      // Never drag an application backwards out of a later stage it has since
      // reached, and never re-decide a withdrawn one.
      if (!application || !['SUBMITTED', 'UNDER_REVIEW'].includes(application.internalStatus)) continue
      await tx.application.update({
        where: { id: move.applicationId },
        data: {
          internalStatus: move.toStatus,
          candidateVisibleStatus: move.toStatus === 'LONGLISTED' ? 'UNDER_REVIEW' : 'UNSUCCESSFUL',
          eligibilityResult: move.toStatus === 'LONGLISTED' ? 'ELIGIBLE' : 'INELIGIBLE',
        },
      })
      await tx.applicationStageHistory.create({
        data: {
          applicationId: move.applicationId,
          fromStatus: application.internalStatus,
          toStatus: move.toStatus,
          changedBy: input.confirmedBy,
          reason: `Confirmed longlist ${run.id}`,
        },
      })
    }

    await tx.longlistRun.update({
      where: { id: run.id },
      data: {
        status: 'CONFIRMED',
        confirmedBy: input.confirmedBy,
        confirmedAt: new Date(),
        confirmationNote: input.note?.trim() || null,
      },
    })

    // Signed last, but inside the same transaction: a failure here rolls back
    // every stage move above it as well as the confirmation itself.
    if (input.sign) await input.sign(tx, moves.length)
  })

  return { runId: run.id, moved: moves.length }
}
