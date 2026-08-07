/**
 * Rule-based longlisting (End_to_End.md §11).
 *
 * This module is deliberately pure: it takes an already-assembled candidate
 * profile plus a rule set and returns a decision. No database access, no dates
 * read from the ambient clock. That makes every rule directly testable and keeps
 * the automatic outcome reproducible when a run is repeated — which §11.3 step
 * 10 ("prevent silent alteration of results") depends on.
 */

/** §11.1 The full catalogue of rule types the spec calls for. */
export const RULE_TYPES = [
  'MINIMUM_QUALIFICATION',
  'REQUIRED_FIELD_OF_STUDY',
  'MINIMUM_EXPERIENCE',
  'MINIMUM_NGO_EXPERIENCE',
  'MINIMUM_TECHNICAL_EXPERIENCE',
  'REQUIRED_LICENCE',
  'REQUIRED_CERTIFICATION',
  'REQUIRED_LANGUAGE',
  'DUTY_STATION_ACCEPTANCE',
  'WORK_AUTHORISATION',
  'REQUIRED_COMPUTER_SKILL',
  'REQUIRED_SECTOR_EXPERIENCE',
  'MINIMUM_MANAGEMENT_EXPERIENCE',
  'AVAILABILITY_BEFORE',
  'WILLINGNESS_TO_TRAVEL',
  'MANDATORY_DOCUMENT',
  'MANDATORY_QUESTION',
  'REQUIRED_ANSWER',
] as const

export type RuleType = (typeof RULE_TYPES)[number]

/** §11.2 How a rule behaves when it is not met. */
export const RULE_CLASSIFICATIONS = ['MANDATORY_KNOCKOUT', 'SCORED', 'PREFERRED', 'INFORMATIONAL'] as const
export type RuleClassification = (typeof RULE_CLASSIFICATIONS)[number]

/** §11.3 step 3. "Unclear" is what routes an application to human review. */
export const RULE_OUTCOMES = ['MET', 'NOT_MET', 'UNCLEAR', 'NOT_APPLICABLE'] as const
export type RuleOutcome = (typeof RULE_OUTCOMES)[number]

/** §11.4 */
export const LONGLIST_OUTCOMES = [
  'AUTOMATICALLY_ELIGIBLE',
  'AUTOMATICALLY_INELIGIBLE',
  'REQUIRES_REVIEW',
  'DUPLICATE_APPLICATION',
  'INCOMPLETE_APPLICATION',
  'WITHDRAWN',
] as const
export type LonglistOutcome = (typeof LONGLIST_OUTCOMES)[number]

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  MINIMUM_QUALIFICATION: 'Minimum academic qualification',
  REQUIRED_FIELD_OF_STUDY: 'Required field of study',
  MINIMUM_EXPERIENCE: 'Minimum years of experience',
  MINIMUM_NGO_EXPERIENCE: 'Minimum years of NGO experience',
  MINIMUM_TECHNICAL_EXPERIENCE: 'Minimum years of technical experience',
  REQUIRED_LICENCE: 'Required professional licence',
  REQUIRED_CERTIFICATION: 'Required certification',
  REQUIRED_LANGUAGE: 'Required language',
  DUTY_STATION_ACCEPTANCE: 'Required duty-station acceptance',
  WORK_AUTHORISATION: 'Required work authorisation',
  REQUIRED_COMPUTER_SKILL: 'Required computer skill',
  REQUIRED_SECTOR_EXPERIENCE: 'Required sector experience',
  MINIMUM_MANAGEMENT_EXPERIENCE: 'Required management experience',
  AVAILABILITY_BEFORE: 'Availability before a defined date',
  WILLINGNESS_TO_TRAVEL: 'Willingness to travel',
  MANDATORY_DOCUMENT: 'Submission of mandatory document',
  MANDATORY_QUESTION: 'Completion of mandatory application question',
  REQUIRED_ANSWER: 'Specific answer to an application question',
}

export const CLASSIFICATION_LABELS: Record<RuleClassification, string> = {
  MANDATORY_KNOCKOUT: 'Mandatory knockout',
  SCORED: 'Scored',
  PREFERRED: 'Preferred',
  INFORMATIONAL: 'Informational',
}

/**
 * §11.1 Academic qualification ladder. Comparing free-text qualifications is
 * unreliable, so each is mapped to a rank and the comparison is numeric. An
 * unrecognised qualification deliberately produces UNCLEAR rather than a
 * rejection — a human decides whether it is equivalent (§11.5).
 */
const QUALIFICATION_RANKS: Array<[RegExp, number]> = [
  [/\b(phd|doctorate|dphil|doctoral)\b/i, 7],
  [/\b(m\.?sc|m\.?a\b|m\.?eng|mba|mph|masters?|postgraduate degree|pgd|msn)\b/i, 6],
  [/\b(pgde|postgraduate diploma)\b/i, 5],
  [/\b(b\.?sc|b\.?a\b|b\.?eng|bachelor|hnd|higher national diploma|first degree)\b/i, 4],
  [/\b(ond|nd\b|national diploma|diploma|nce)\b/i, 3],
  [/\b(ssce|waec|neco|secondary|high school|o.?level)\b/i, 2],
  [/\b(primary|fslc)\b/i, 1],
]

export function qualificationRank(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  for (const [pattern, rank] of QUALIFICATION_RANKS) if (pattern.test(value)) return rank
  return null
}

const LANGUAGE_LEVELS: Record<string, number> = { BASIC: 1, FLUENT: 2, NATIVE: 3 }
const PROFICIENCY_LEVELS: Record<string, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 }

/** The candidate data a rule may be evaluated against. */
export interface LonglistCandidateFacts {
  education: Array<{ qualification: string; fieldOfStudy: string; completionYear: number | null }>
  employment: Array<{
    employer: string
    jobTitle: string
    employmentType: string
    startDate: Date
    endDate: Date | null
    responsibilities: string | null
    sector?: string | null
  }>
  licences: Array<{ professionalBody: string; licenceType: string; verificationStatus: string; expiryDate: Date | null }>
  certifications: Array<{ name: string; issuingBody: string; expiryDate: Date | null }>
  skills: Array<{ name: string; category: string | null; proficiency: string | null }>
  languages: Array<{ language: string; speakingLevel: string; readingLevel: string; writingLevel: string }>
  answers: Map<string, unknown>
  documents: Set<string>
  earliestStartDate: Date | null
  willingnessToRelocate: boolean
  preferredDutyLocations: string[]
  workAuthorisation: string | null
}

export interface LonglistRule {
  id: string
  ruleType: string
  classification: string
  label: string
  field: string | null
  operator: string
  expected: unknown
  failureMessage: string
  weight: number
}

export interface RuleEvaluation {
  ruleId: string
  ruleType: string
  classification: string
  label: string
  outcome: RuleOutcome
  observed: unknown
  expected: unknown
  message: string
  /** Points awarded for a SCORED rule; 0 for all other classifications. */
  awardedWeight: number
  maximumWeight: number
}

/** Overlapping employment must not be double-counted as experience. */
export function mergedYears(
  ranges: Array<{ startDate: Date; endDate: Date | null }>,
  now: Date
): number {
  const spans = ranges
    .map((item) => [item.startDate.getTime(), Math.min(item.endDate?.getTime() ?? now.getTime(), now.getTime())] as const)
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const span of spans) {
    const last = merged.at(-1)
    if (!last || span[0] > last[1]) merged.push([span[0], span[1]])
    else last[1] = Math.max(last[1], span[1])
  }
  return merged.reduce((total, [start, end]) => total + (end - start), 0) / (365.25 * 86_400_000)
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
  if (value === null || value === undefined) return []
  return [String(value).trim().toLowerCase()].filter(Boolean)
}

function textIncludesAny(haystack: string, needles: string[]): boolean {
  const value = haystack.toLowerCase()
  return needles.some((needle) => needle && value.includes(needle))
}

const NGO_EMPLOYER_HINTS = [
  'ngo',
  'foundation',
  'humanitarian',
  'relief',
  'charity',
  'trust',
  'initiative',
  'unicef',
  'unhcr',
  'wfp',
  'who',
  'oxfam',
  'save the children',
  'care international',
  'msf',
  'medecins',
  'red cross',
  'crescent',
  'mercy corps',
  'plan international',
  'action against hunger',
  'norwegian refugee',
  'danish refugee',
  'international rescue',
]

/** A single rule against one candidate. Never throws; unknown input is UNCLEAR. */
export function evaluateRule(rule: LonglistRule, facts: LonglistCandidateFacts, now: Date): RuleEvaluation {
  const maximumWeight = rule.classification === 'SCORED' ? Number(rule.weight) || 0 : 0
  const base = {
    ruleId: rule.id,
    ruleType: rule.ruleType,
    classification: rule.classification,
    label: rule.label,
    expected: rule.expected,
    message: rule.failureMessage,
    maximumWeight,
  }
  const settle = (outcome: RuleOutcome, observed: unknown): RuleEvaluation => ({
    ...base,
    outcome,
    observed,
    awardedWeight: outcome === 'MET' ? maximumWeight : 0,
  })

  switch (rule.ruleType as RuleType) {
    case 'MINIMUM_QUALIFICATION': {
      const required = qualificationRank(String(rule.expected ?? ''))
      if (required === null) return settle('UNCLEAR', null)
      if (!facts.education.length) return settle('NOT_MET', [])
      const ranks = facts.education.map((item) => qualificationRank(item.qualification))
      const best = ranks.reduce<number | null>((max, rank) => (rank === null ? max : Math.max(max ?? 0, rank)), null)
      const observed = facts.education.map((item) => item.qualification)
      // An unrecognised qualification alongside no qualifying one is exactly the
      // "equivalent qualification" case §11.5 reserves for a human.
      if (best === null) return settle('UNCLEAR', observed)
      if (best >= required) return settle('MET', observed)
      if (ranks.some((rank) => rank === null)) return settle('UNCLEAR', observed)
      return settle('NOT_MET', observed)
    }

    case 'REQUIRED_FIELD_OF_STUDY': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      if (!facts.education.length) return settle('NOT_MET', [])
      const observed = facts.education.map((item) => item.fieldOfStudy)
      return settle(observed.some((field) => textIncludesAny(field, wanted)) ? 'MET' : 'NOT_MET', observed)
    }

    case 'MINIMUM_EXPERIENCE': {
      const required = Number(rule.expected)
      if (!Number.isFinite(required)) return settle('UNCLEAR', null)
      if (!facts.employment.length) return settle('NOT_MET', 0)
      const years = mergedYears(facts.employment, now)
      return settle(years >= required ? 'MET' : 'NOT_MET', Math.round(years * 10) / 10)
    }

    case 'MINIMUM_NGO_EXPERIENCE': {
      const required = Number(rule.expected)
      if (!Number.isFinite(required)) return settle('UNCLEAR', null)
      const ngoRoles = facts.employment.filter(
        (item) => textIncludesAny(item.employer, NGO_EMPLOYER_HINTS) || item.employmentType === 'NGO'
      )
      const years = mergedYears(ngoRoles, now)
      // Employer names are not a reliable sector signal. If the candidate has
      // relevant-looking experience but falls short, ask a human rather than
      // rejecting on a keyword list.
      if (years < required && ngoRoles.length && years > 0) return settle('UNCLEAR', Math.round(years * 10) / 10)
      return settle(years >= required ? 'MET' : 'NOT_MET', Math.round(years * 10) / 10)
    }

    case 'MINIMUM_TECHNICAL_EXPERIENCE': {
      const required = Number(rule.expected)
      const keywords = asList(rule.field ?? '')
      if (!Number.isFinite(required)) return settle('UNCLEAR', null)
      if (!keywords.length) return settle('NOT_APPLICABLE', null)
      const matching = facts.employment.filter(
        (item) =>
          textIncludesAny(item.jobTitle, keywords) || textIncludesAny(item.responsibilities ?? '', keywords)
      )
      const years = mergedYears(matching, now)
      if (years < required && matching.length) return settle('UNCLEAR', Math.round(years * 10) / 10)
      return settle(years >= required ? 'MET' : 'NOT_MET', Math.round(years * 10) / 10)
    }

    case 'MINIMUM_MANAGEMENT_EXPERIENCE': {
      const required = Number(rule.expected)
      if (!Number.isFinite(required)) return settle('UNCLEAR', null)
      const hints = ['manager', 'head of', 'lead', 'director', 'supervisor', 'coordinator', 'chief']
      const matching = facts.employment.filter(
        (item) => textIncludesAny(item.jobTitle, hints) || textIncludesAny(item.responsibilities ?? '', ['supervis', 'line manage', 'managed a team'])
      )
      const years = mergedYears(matching, now)
      if (years < required && matching.length) return settle('UNCLEAR', Math.round(years * 10) / 10)
      return settle(years >= required ? 'MET' : 'NOT_MET', Math.round(years * 10) / 10)
    }

    case 'REQUIRED_SECTOR_EXPERIENCE': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      const observed = facts.employment.map((item) => `${item.employer} ${item.jobTitle}`)
      const matched = facts.employment.some(
        (item) =>
          textIncludesAny(item.employer, wanted) ||
          textIncludesAny(item.jobTitle, wanted) ||
          textIncludesAny(item.responsibilities ?? '', wanted) ||
          textIncludesAny(item.sector ?? '', wanted)
      )
      return settle(matched ? 'MET' : 'NOT_MET', observed)
    }

    case 'REQUIRED_LICENCE': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      // A licence that is unverified is not yet a failure — it is unclear.
      const valid = facts.licences.filter(
        (item) =>
          item.verificationStatus.toUpperCase() === 'VERIFIED' &&
          (!item.expiryDate || item.expiryDate > now)
      )
      const pending = facts.licences.filter((item) => item.verificationStatus.toUpperCase() === 'UNVERIFIED')
      const describe = (item: { professionalBody: string; licenceType: string }) =>
        `${item.professionalBody} ${item.licenceType}`.trim()
      const observed = facts.licences.map(describe)
      if (valid.some((item) => textIncludesAny(describe(item), wanted))) return settle('MET', observed)
      if (pending.some((item) => textIncludesAny(describe(item), wanted))) return settle('UNCLEAR', observed)
      return settle('NOT_MET', observed)
    }

    case 'REQUIRED_CERTIFICATION': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      const current = facts.certifications.filter((item) => !item.expiryDate || item.expiryDate > now)
      const observed = facts.certifications.map((item) => item.name)
      if (current.some((item) => textIncludesAny(`${item.name} ${item.issuingBody}`, wanted)))
        return settle('MET', observed)
      // Held but expired is a recoverable gap, not an automatic rejection.
      if (facts.certifications.some((item) => textIncludesAny(item.name, wanted)))
        return settle('UNCLEAR', observed)
      return settle('NOT_MET', observed)
    }

    case 'REQUIRED_LANGUAGE': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      const minimumLevel = LANGUAGE_LEVELS[String(rule.field || 'FLUENT').toUpperCase()] ?? 2
      const observed = facts.languages.map((item) => `${item.language} (${item.speakingLevel})`)
      const matched = facts.languages.some((item) => {
        if (!textIncludesAny(item.language, wanted)) return false
        const level = Math.max(
          LANGUAGE_LEVELS[item.speakingLevel?.toUpperCase()] ?? 0,
          LANGUAGE_LEVELS[item.readingLevel?.toUpperCase()] ?? 0,
          LANGUAGE_LEVELS[item.writingLevel?.toUpperCase()] ?? 0
        )
        return level >= minimumLevel
      })
      return settle(matched ? 'MET' : 'NOT_MET', observed)
    }

    case 'REQUIRED_COMPUTER_SKILL': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      const minimum = PROFICIENCY_LEVELS[String(rule.field || 'INTERMEDIATE').toUpperCase()] ?? 2
      const observed = facts.skills.map((item) => `${item.name}${item.proficiency ? ` (${item.proficiency})` : ''}`)
      const matched = facts.skills.some(
        (item) =>
          textIncludesAny(item.name, wanted) &&
          (PROFICIENCY_LEVELS[String(item.proficiency || '').toUpperCase()] ?? 0) >= minimum
      )
      // Skill claimed but with no stated proficiency: a human should judge it.
      const claimedWithoutLevel = facts.skills.some(
        (item) => textIncludesAny(item.name, wanted) && !item.proficiency
      )
      if (!matched && claimedWithoutLevel) return settle('UNCLEAR', observed)
      return settle(matched ? 'MET' : 'NOT_MET', observed)
    }

    case 'DUTY_STATION_ACCEPTANCE': {
      const station = String(rule.expected ?? '').trim().toLowerCase()
      if (!station) return settle('NOT_APPLICABLE', null)
      if (facts.willingnessToRelocate) return settle('MET', 'Willing to relocate')
      if (!facts.preferredDutyLocations.length) return settle('UNCLEAR', [])
      const accepted = facts.preferredDutyLocations.some(
        (location) => location.toLowerCase().includes(station) || station.includes(location.toLowerCase())
      )
      return settle(accepted ? 'MET' : 'NOT_MET', facts.preferredDutyLocations)
    }

    case 'WORK_AUTHORISATION': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      if (!facts.workAuthorisation) return settle('UNCLEAR', null)
      return settle(textIncludesAny(facts.workAuthorisation, wanted) ? 'MET' : 'NOT_MET', facts.workAuthorisation)
    }

    case 'AVAILABILITY_BEFORE': {
      const deadline = rule.expected ? new Date(String(rule.expected)) : null
      if (!deadline || Number.isNaN(deadline.getTime())) return settle('UNCLEAR', null)
      if (!facts.earliestStartDate) return settle('UNCLEAR', null)
      return settle(
        facts.earliestStartDate <= deadline ? 'MET' : 'NOT_MET',
        facts.earliestStartDate.toISOString().slice(0, 10)
      )
    }

    case 'WILLINGNESS_TO_TRAVEL': {
      const answer = rule.field ? facts.answers.get(rule.field) : undefined
      if (answer === undefined || answer === null || answer === '') return settle('UNCLEAR', null)
      const truthy = answer === true || ['yes', 'true', 'y'].includes(String(answer).trim().toLowerCase())
      return settle(truthy ? 'MET' : 'NOT_MET', answer)
    }

    case 'MANDATORY_DOCUMENT': {
      const wanted = asList(rule.expected)
      if (!wanted.length) return settle('NOT_APPLICABLE', null)
      const held = [...facts.documents].map((item) => item.toLowerCase())
      const present = wanted.every((needle) => held.some((item) => item.includes(needle)))
      return settle(present ? 'MET' : 'NOT_MET', [...facts.documents])
    }

    case 'MANDATORY_QUESTION': {
      if (!rule.field) return settle('NOT_APPLICABLE', null)
      const answer = facts.answers.get(rule.field)
      const answered =
        answer !== undefined &&
        answer !== null &&
        !(typeof answer === 'string' && !answer.trim()) &&
        !(Array.isArray(answer) && answer.length === 0)
      return settle(answered ? 'MET' : 'NOT_MET', answer ?? null)
    }

    case 'REQUIRED_ANSWER': {
      if (!rule.field) return settle('NOT_APPLICABLE', null)
      const answer = facts.answers.get(rule.field)
      if (answer === undefined || answer === null || answer === '') return settle('UNCLEAR', null)
      const observed = answer
      const expectedList = asList(rule.expected)
      const answerText = String(answer).trim().toLowerCase()
      switch (rule.operator) {
        case 'EQUALS':
          return settle(answerText === String(rule.expected).trim().toLowerCase() ? 'MET' : 'NOT_MET', observed)
        case 'IN':
          return settle(expectedList.includes(answerText) ? 'MET' : 'NOT_MET', observed)
        case 'CONTAINS':
          return settle(textIncludesAny(answerText, expectedList) ? 'MET' : 'NOT_MET', observed)
        case 'TRUE':
          return settle(answer === true || ['yes', 'true', 'y'].includes(answerText) ? 'MET' : 'NOT_MET', observed)
        case 'GTE': {
          const numeric = Number(answer)
          if (!Number.isFinite(numeric)) return settle('UNCLEAR', observed)
          return settle(numeric >= Number(rule.expected) ? 'MET' : 'NOT_MET', numeric)
        }
        case 'LTE': {
          const numeric = Number(answer)
          if (!Number.isFinite(numeric)) return settle('UNCLEAR', observed)
          return settle(numeric <= Number(rule.expected) ? 'MET' : 'NOT_MET', numeric)
        }
        case 'BEFORE':
        case 'AFTER': {
          const value = new Date(String(answer))
          const bound = new Date(String(rule.expected))
          if (Number.isNaN(value.getTime()) || Number.isNaN(bound.getTime())) return settle('UNCLEAR', observed)
          return settle(
            (rule.operator === 'BEFORE' ? value <= bound : value >= bound) ? 'MET' : 'NOT_MET',
            value.toISOString().slice(0, 10)
          )
        }
        default:
          return settle('UNCLEAR', observed)
      }
    }

    default:
      // An unrecognised rule type must never silently pass a candidate.
      return settle('UNCLEAR', null)
  }
}

export interface LonglistDecision {
  outcome: LonglistOutcome
  results: RuleEvaluation[]
  /** §11.3 step 4 — null when no scored rules are configured. */
  eligibilityScore: number | null
  maximumScore: number | null
  /** §11.3 step 8 — the rule that actually decided the outcome. */
  decidingRuleId: string | null
}

/**
 * §11.3 Apply a whole rule set and place the application.
 *
 * Precedence matters and is deliberate:
 *   1. a failed mandatory knockout is fatal, whatever else passed;
 *   2. anything unclear on a rule that could be fatal goes to human review;
 *   3. only a clean pass is automatically eligible.
 * Preferred and informational rules never change the outcome — §11.2 says they
 * inform the shortlist, not the longlist.
 */
export function evaluateLonglist(
  rules: LonglistRule[],
  facts: LonglistCandidateFacts,
  now: Date
): LonglistDecision {
  const results = rules.map((rule) => evaluateRule(rule, facts, now))

  const scored = results.filter((result) => result.classification === 'SCORED')
  const maximumScore = scored.reduce((total, result) => total + result.maximumWeight, 0)
  const eligibilityScore = scored.reduce((total, result) => total + result.awardedWeight, 0)

  const knockouts = results.filter((result) => result.classification === 'MANDATORY_KNOCKOUT')
  const failedKnockout = knockouts.find((result) => result.outcome === 'NOT_MET')
  if (failedKnockout)
    return {
      outcome: 'AUTOMATICALLY_INELIGIBLE',
      results,
      eligibilityScore: scored.length ? eligibilityScore : null,
      maximumScore: scored.length ? maximumScore : null,
      decidingRuleId: failedKnockout.ruleId,
    }

  const unclearKnockout = knockouts.find((result) => result.outcome === 'UNCLEAR')
  if (unclearKnockout)
    return {
      outcome: 'REQUIRES_REVIEW',
      results,
      eligibilityScore: scored.length ? eligibilityScore : null,
      maximumScore: scored.length ? maximumScore : null,
      decidingRuleId: unclearKnockout.ruleId,
    }

  // With no mandatory rules at all there is nothing to decide automatically.
  if (!knockouts.length)
    return {
      outcome: 'REQUIRES_REVIEW',
      results,
      eligibilityScore: scored.length ? eligibilityScore : null,
      maximumScore: scored.length ? maximumScore : null,
      decidingRuleId: null,
    }

  return {
    outcome: 'AUTOMATICALLY_ELIGIBLE',
    results,
    eligibilityScore: scored.length ? eligibilityScore : null,
    maximumScore: scored.length ? maximumScore : null,
    decidingRuleId: null,
  }
}

/** §11.6 The approved override reasons. Free text alone is not enough. */
export const OVERRIDE_REASON_CODES = [
  'EQUIVALENT_QUALIFICATION',
  'EQUIVALENT_EXPERIENCE',
  'DOCUMENT_RECEIVED_LATE',
  'DATA_ENTRY_CORRECTION',
  'SYSTEM_PARSING_ERROR',
  'REASONABLE_ACCOMMODATION',
  'APPROVED_POLICY_EXCEPTION',
  'DUPLICATE_RESOLVED',
] as const

export type OverrideReasonCode = (typeof OVERRIDE_REASON_CODES)[number]

export const OVERRIDE_REASON_LABELS: Record<OverrideReasonCode, string> = {
  EQUIVALENT_QUALIFICATION: 'Equivalent qualification accepted',
  EQUIVALENT_EXPERIENCE: 'Equivalent experience accepted',
  DOCUMENT_RECEIVED_LATE: 'Missing document since received',
  DATA_ENTRY_CORRECTION: 'Data entry corrected',
  SYSTEM_PARSING_ERROR: 'System parsing error',
  REASONABLE_ACCOMMODATION: 'Reasonable accommodation applied',
  APPROVED_POLICY_EXCEPTION: 'Approved policy exception',
  DUPLICATE_RESOLVED: 'Duplicate application resolved',
}

/** Overrides that materially change an outcome need evidence on file (§11.6). */
export function overrideRequiresEvidence(code: string): boolean {
  return ['EQUIVALENT_QUALIFICATION', 'EQUIVALENT_EXPERIENCE', 'DOCUMENT_RECEIVED_LATE', 'APPROVED_POLICY_EXCEPTION'].includes(
    code
  )
}

/** Overrides that need a second pair of eyes before they take effect (§11.6). */
export function overrideRequiresApproval(code: string): boolean {
  return ['APPROVED_POLICY_EXCEPTION', 'EQUIVALENT_QUALIFICATION'].includes(code)
}
