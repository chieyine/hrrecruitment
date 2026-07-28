import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody, scorecardSubmitSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'

/**
 * Resolve the screening scorecard template (+criteria) for an application:
 * the vacancy's configured template if set, else the first active SCREENING
 * template. Returns null if none exists.
 */
async function resolveTemplate(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { vacancy: { select: { screeningScorecardTemplateId: true } } },
  })
  if (!application) return { application: null, template: null }

  const templateId = application.vacancy.screeningScorecardTemplateId
  const template = templateId
    ? await prisma.scorecardTemplate.findUnique({ where: { id: templateId }, include: { criteria: true } })
    : await prisma.scorecardTemplate.findFirst({
        where: { scorecardType: 'SCREENING', active: true },
        include: { criteria: true },
      })
  return { application, template }
}

// GET ?applicationId=... → the resolved template + criteria for rendering the form.
export async function GET(request: Request) {
  try {
    const user = await requirePermission('scorecard.submit')
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }
    const { application, template } = await resolveTemplate(applicationId)
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!template) return NextResponse.json({ error: 'No screening scorecard template configured' }, { status: 404 })
    if (!(await hasPermission(user.userId, 'application.read.all'))) {
      const assigned = await prisma.application.findFirst({
        where: {
          id: applicationId,
          OR: [{ assignedReviewerId: user.userId }, { vacancy: { ownerUserId: user.userId } }],
        },
        select: { id: true },
      })
      if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ template })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('scorecard.submit')
    const { applicationId, criterionScores } = await parseBody(request, scorecardSubmitSchema)

    const { application, template } = await resolveTemplate(applicationId)
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!template) {
      return NextResponse.json({ error: 'No screening scorecard template configured' }, { status: 404 })
    }
    const mayReadAll = await hasPermission(user.userId, 'application.read.all')
    if (!mayReadAll) {
      const assigned = await prisma.application.findFirst({
        where: {
          id: applicationId,
          OR: [{ assignedReviewerId: user.userId }, { vacancy: { ownerUserId: user.userId } }],
        },
        select: { id: true },
      })
      if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const declaration = await prisma.conflictDeclaration.findFirst({
      where: { applicationId, userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })
    if (!declaration)
      return NextResponse.json(
        { error: 'Complete the conflict-of-interest declaration before scoring' },
        { status: 409 }
      )
    if (declaration.conflictType !== 'NONE' && !declaration.resolution) {
      return NextResponse.json({ error: 'This declared conflict must be resolved before scoring' }, { status: 409 })
    }

    // Validate every submitted criterionId genuinely belongs to the template,
    // and clamp scores to each criterion's maximum (fixes the FK-violation bug).
    const criteriaById = new Map(template.criteria.map((c) => [c.id, c]))
    const submittedById = new Map(criterionScores.map((score) => [score.criterionId, score]))
    const missingCriterion = template.criteria.find(
      (criterion) => criterion.required && !submittedById.has(criterion.id)
    )
    if (missingCriterion)
      return NextResponse.json(
        { error: `Mandatory criterion "${missingCriterion.name}" must be scored` },
        { status: 422 }
      )
    for (const s of criterionScores) {
      const criterion = criteriaById.get(s.criterionId)
      if (!criterion) {
        return NextResponse.json({ error: `Unknown criterion ${s.criterionId} for this scorecard` }, { status: 422 })
      }
      if (s.score > criterion.maximumScore) {
        return NextResponse.json(
          { error: `Score for "${criterion.name}" exceeds its maximum of ${criterion.maximumScore}` },
          { status: 422 }
        )
      }
      if (criterion.commentRequired && !s.comment?.trim())
        return NextResponse.json({ error: `A comment is required for "${criterion.name}"` }, { status: 422 })
    }

    const existingSubmitted = await prisma.candidateScorecard.findFirst({
      where: { applicationId, reviewerUserId: user.userId, status: 'SUBMITTED' },
      select: { id: true },
    })
    if (existingSubmitted)
      return NextResponse.json(
        {
          error: 'Your submitted scorecard is locked. An authorized user must reopen it before changes.',
          scorecardId: existingSubmitted.id,
        },
        { status: 409 }
      )

    const weightedAwarded = criterionScores.reduce((sum, s) => {
      const c = criteriaById.get(s.criterionId)!
      return sum + s.score * (c.weight ?? 1)
    }, 0)
    const weightedPossible = template.criteria.reduce(
      (sum, criterion) => sum + criterion.maximumScore * (criterion.weight ?? 1),
      0
    )
    const totalScore = weightedPossible > 0 ? Math.round((weightedAwarded / weightedPossible) * 10_000) / 100 : 0

    const candidateScorecard = await prisma.$transaction(async (tx) => {
      const existing = await tx.candidateScorecard.findUnique({
        where: {
          applicationId_scorecardTemplateId_reviewerUserId: {
            applicationId,
            scorecardTemplateId: template.id,
            reviewerUserId: user.userId,
          },
        },
        include: { criterionScores: true },
      })
      if (existing?.status === 'SUBMITTED') throw new Error('SCORECARD_LOCKED')
      const previousVersions =
        existing?.status === 'REOPENED' && existing.submittedAt
          ? [
              ...JSON.parse(existing.previousVersionsJson || '[]'),
              {
                version: existing.version,
                totalScore: existing.totalScore,
                submittedAt: existing.submittedAt,
                reopenedAt: existing.reopenedAt,
                reopenedBy: existing.reopenedBy,
                reopenReason: existing.reopenReason,
                criterionScores: existing.criterionScores.map((score) => ({
                  criterionId: score.criterionId,
                  score: score.score,
                  comment: score.comment,
                  evidence: score.evidence,
                })),
              },
            ].slice(-20)
          : []
      const saved = existing
        ? await tx.candidateScorecard.update({
            where: { id: existing.id },
            data: {
              status: 'SUBMITTED',
              totalScore,
              submittedAt: new Date(),
              templateSnapshotJson: JSON.stringify(template),
              version: { increment: 1 },
              previousVersionsJson: JSON.stringify(previousVersions),
              reopenedAt: null,
              reopenedBy: null,
              reopenReason: null,
              criterionScores: {
                deleteMany: {},
                create: criterionScores.map((score) => ({
                  criterionId: score.criterionId,
                  score: score.score,
                  comment: score.comment || null,
                })),
              },
            },
          })
        : await tx.candidateScorecard.create({
            data: {
              applicationId,
              scorecardTemplateId: template.id,
              reviewerUserId: user.userId,
              status: 'SUBMITTED',
              totalScore,
              submittedAt: new Date(),
              templateSnapshotJson: JSON.stringify(template),
              criterionScores: {
                create: criterionScores.map((score) => ({
                  criterionId: score.criterionId,
                  score: score.score,
                  comment: score.comment || null,
                })),
              },
            },
          })
      await tx.application.update({ where: { id: applicationId }, data: { screeningScore: totalScore } })
      return saved
    })
    await refreshApplicationFinalScore(applicationId)

    await logAudit({
      actorUserId: user.userId,
      action: 'SCORECARD_SUBMITTED',
      resourceType: 'CandidateScorecard',
      resourceId: candidateScorecard.id,
      newValue: { totalScore },
    })

    return NextResponse.json({ success: true, scorecardId: candidateScorecard.id, totalScore })
  } catch (err) {
    if (err instanceof Error && err.message === 'SCORECARD_LOCKED')
      return NextResponse.json(
        { error: 'Your submitted scorecard is locked. An authorized user must reopen it before changes.' },
        { status: 409 }
      )
    return authzResponse(err)
  }
}
