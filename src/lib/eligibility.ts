import { prisma } from './prisma'

function totalExperienceYears(items: { startDate: Date; endDate: Date | null }[]) {
  const now = Date.now()
  const ranges = items
    .map((item) => [item.startDate.getTime(), Math.min(item.endDate?.getTime() ?? now, now)] as const)
    .filter(([start, end]) => start <= now && end > start)
    .sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (!last || range[0] > last[1]) merged.push([range[0], range[1]])
    else last[1] = Math.max(last[1], range[1])
  }
  return merged.reduce((sum, [start, end]) => sum + (end - start), 0) / (365.25 * 86_400_000)
}

export async function evaluateApplicationEligibility(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      vacancy: { include: { questions: true } },
      candidate: { include: { employment: true, licences: true } },
      answers: true,
      snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!application) throw new Error('Application not found')
  let snapshot: any = null
  if (application.snapshots[0]) {
    try {
      snapshot = JSON.parse(application.snapshots[0].profileJson)
    } catch {
      throw new Error('Submitted application snapshot is invalid; manual eligibility review is required')
    }
  }
  const configured = Array.isArray(snapshot?._eligibilityRules)
    ? snapshot._eligibilityRules
    : await prisma.eligibilityRule.findMany({
        where: { vacancyId: application.vacancyId, active: true },
        orderBy: { createdAt: 'asc' },
      })
  const answerMap = new Map(
    application.answers.map((answer) => {
      try {
        return [answer.vacancyQuestionId, JSON.parse(answer.answerJson)]
      } catch {
        return [answer.vacancyQuestionId, answer.answerJson]
      }
    })
  )
  const employment = Array.isArray(snapshot?.employment)
    ? snapshot.employment.map((item: any) => ({
        startDate: new Date(item.startDate),
        endDate: item.endDate ? new Date(item.endDate) : null,
      }))
    : application.candidate.employment
  const licences = Array.isArray(snapshot?.licences) ? snapshot.licences : application.candidate.licences
  const experience = totalExperienceYears(employment)
  const minimumExperienceYears = Number.isFinite(snapshot?._minimumExperienceYears)
    ? Number(snapshot._minimumExperienceYears)
    : application.vacancy.minimumExperienceYears
  const results: Array<{
    ruleId: string
    ruleType: string
    passed: boolean
    observed: unknown
    expected: unknown
    message: string
  }> = []
  if (minimumExperienceYears > 0)
    results.push({
      ruleId: 'BUILTIN_MINIMUM_EXPERIENCE',
      ruleType: 'MINIMUM_EXPERIENCE',
      passed: experience >= minimumExperienceYears,
      observed: Math.round(experience * 10) / 10,
      expected: minimumExperienceYears,
      message: `Minimum ${minimumExperienceYears} years experience`,
    })
  for (const rule of configured) {
    let expected: any
    try {
      expected = JSON.parse(rule.expectedJson)
    } catch {
      expected = rule.expectedJson
    }
    let observed: any = null
    let passed = false
    if (rule.ruleType === 'MINIMUM_EXPERIENCE') {
      observed = Math.round(experience * 10) / 10
      // Compare the unrounded duration. Display rounding must not promote a
      // candidate who is still below the configured threshold.
      passed = experience >= Number(expected)
    } else if (rule.ruleType === 'REQUIRED_LICENCE') {
      const now = new Date()
      const validLicences = licences.filter((item: any) => {
        const status = String(item.verificationStatus || '').toUpperCase()
        const expiry = item.expiryDate ? new Date(item.expiryDate) : null
        return status === 'VERIFIED' && (!expiry || (!Number.isNaN(expiry.getTime()) && expiry > now))
      })
      observed = validLicences.map((item: any) => `${item.professionalBody} ${item.licenceType}`.trim())
      const expectedValues = (Array.isArray(expected) ? expected : [expected])
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
      passed = observed.some((value: string) => expectedValues.includes(value.trim().toLowerCase()))
    } else if (rule.ruleType === 'REQUIRED_ANSWER' && rule.field) {
      observed = answerMap.get(rule.field)
      if (rule.operator === 'EQUALS') passed = String(observed).toLowerCase() === String(expected).toLowerCase()
      else if (rule.operator === 'IN')
        passed =
          Array.isArray(expected) &&
          expected
            .map(String)
            .map((value) => value.toLowerCase())
            .includes(String(observed).toLowerCase())
      else if (rule.operator === 'TRUE') passed = observed === true || String(observed).toLowerCase() === 'yes'
    }
    results.push({ ruleId: rule.id, ruleType: rule.ruleType, passed, observed, expected, message: rule.failureMessage })
  }
  const failed = results.filter((result) => !result.passed)
  const suggestedOutcome = failed.length ? 'POSSIBLY_INELIGIBLE' : results.length ? 'ELIGIBLE' : 'REVIEW_REQUIRED'
  return prisma.eligibilityEvaluation.create({
    data: {
      applicationId,
      ruleVersionJson: JSON.stringify(configured.map((rule: any) => ({ id: rule.id, version: rule.version }))),
      resultJson: JSON.stringify(results),
      suggestedOutcome,
    },
  })
}
