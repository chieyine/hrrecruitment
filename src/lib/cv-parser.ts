/**
 * Structured CV parsing (End_to_End.md §28.1).
 *
 * Two constraints from the spec shape this module:
 *   - "CV parsing should only organise information. It should not independently
 *     decide whether a candidate is suitable." Nothing here scores or ranks.
 *   - "Candidates should be able to review and correct extracted information
 *     before submitting an application." Everything returned is a *draft*.
 *
 * The parser is heuristic and deliberately conservative: when a line is
 * ambiguous it is left out rather than guessed at, because a wrong value the
 * candidate has to notice and correct is worse than a blank one they expect to
 * fill.
 */

export interface ParsedEducation {
  institution: string | null
  qualification: string | null
  fieldOfStudy: string | null
  completionYear: number | null
}

export interface ParsedEmployment {
  employer: string | null
  jobTitle: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
}

export interface ParsedCv {
  fullName: string | null
  email: string | null
  phone: string | null
  education: ParsedEducation[]
  employment: ParsedEmployment[]
  skills: string[]
  certifications: string[]
  languages: string[]
  professionalMemberships: string[]
  totalExperienceYears: number | null
  /** 0–1. Reflects how much was found, never how good the candidate is. */
  confidence: number
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const SECTION_PATTERNS: Array<[keyof typeof SECTION_KEYS, RegExp]> = [
  ['education', /^\s*(education|academic (background|qualification)s?|qualifications?)\s*:?\s*$/i],
  ['employment', /^\s*(work|professional|employment)\s+(experience|history)|^\s*(experience|career history)\s*:?\s*$/i],
  ['skills', /^\s*(skills|technical skills|competenc(y|ies)|core competencies)\s*:?\s*$/i],
  ['certifications', /^\s*(certifications?|licen[cs]es?|training)\s*:?\s*$/i],
  ['languages', /^\s*languages?\s*:?\s*$/i],
  ['memberships', /^\s*(memberships?|professional (memberships?|affiliations?)|affiliations?)\s*:?\s*$/i],
  ['other', /^\s*(references?|referees?|hobbies|interests|personal (details|profile)|objective|summary|profile)\s*:?\s*$/i],
]

const SECTION_KEYS = {
  education: 1,
  employment: 1,
  skills: 1,
  certifications: 1,
  languages: 1,
  memberships: 1,
  other: 1,
} as const

type SectionKey = keyof typeof SECTION_KEYS

const QUALIFICATION_PATTERN =
  /\b(ph\.?d|doctorate|m\.?sc|m\.?a\b|m\.?eng|mba|mph|msn|master(?:'?s)?|pgde?|b\.?sc|b\.?a\b|b\.?eng|b\.?tech|bachelor(?:'?s)?|hnd|ond|nce|national diploma|higher national diploma|diploma|ssce|waec|neco)\b/i

/** Split a raw text CV into lines, dropping decorative separators. */
function toLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[•·▪◦*]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0 && !/^[-=_~]{3,}$/.test(line))
}

function detectSection(line: string): SectionKey | null {
  // A heading is short. A sentence that happens to contain "education" is not
  // a heading, and treating it as one swallows the paragraph beneath it.
  if (line.length > 60) return null
  for (const [key, pattern] of SECTION_PATTERNS) if (pattern.test(line)) return key as SectionKey
  return null
}

export function extractEmail(text: string): string | null {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  return match ? match[0].toLowerCase() : null
}

export function extractPhone(text: string): string | null {
  // Nigerian and international forms, requiring enough digits to be a real number.
  const match = text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/g)
  if (!match) return null
  const best = match.map((value) => value.trim()).find((value) => value.replace(/\D/g, '').length >= 10)
  return best ?? null
}

/**
 * The name is usually the first substantial line, before any contact details.
 * A line containing an @ or a long run of digits is contact information, not a name.
 */
export function extractName(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    if (line.includes('@') || /\d{4,}/.test(line)) continue
    if (detectSection(line)) continue
    if (/^(curriculum vitae|cv|r[ée]sum[ée])$/i.test(line)) continue
    const words = line.split(/\s+/).filter(Boolean)
    if (words.length < 2 || words.length > 5) continue
    // Names are alphabetic, possibly hyphenated or apostrophised.
    if (!words.every((word) => /^[A-Za-z][A-Za-z'’-]*\.?$/.test(word))) continue
    return line
  }
  return null
}

/** Parse a year, rejecting values that cannot be a real education year. */
function parseYear(value: string): number | null {
  const year = Number(value)
  if (!Number.isInteger(year)) return null
  const currentYear = new Date().getUTCFullYear()
  return year >= 1950 && year <= currentYear + 10 ? year : null
}

/** "Jan 2019", "01/2019", "2019" -> ISO-ish "2019-01" / "2019". */
function parseMonthYear(value: string): string | null {
  const monthName = value.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{4})\b/i)
  if (monthName) {
    const month = MONTHS[monthName[1].toLowerCase()]
    const year = parseYear(monthName[2])
    if (month && year) return `${year}-${String(month).padStart(2, '0')}`
  }
  const numeric = value.match(/\b(\d{1,2})[\/.](\d{4})\b/)
  if (numeric) {
    const month = Number(numeric[1])
    const year = parseYear(numeric[2])
    if (month >= 1 && month <= 12 && year) return `${year}-${String(month).padStart(2, '0')}`
  }
  const yearOnly = value.match(/\b(\d{4})\b/)
  if (yearOnly) {
    const year = parseYear(yearOnly[1])
    if (year) return String(year)
  }
  return null
}

const PRESENT_PATTERN = /\b(present|current|to date|till date|ongoing|now)\b/i

/** A line that expresses a date range, e.g. "Mar 2019 – Present". */
function parseDateRange(line: string): { start: string; end: string | null; isCurrent: boolean } | null {
  const separator = line.match(/\s[–—−-]{1,2}\s|\s+(?:to|until)\s+/i)
  if (!separator || separator.index === undefined) return null
  const left = line.slice(0, separator.index)
  const right = line.slice(separator.index + separator[0].length)
  const start = parseMonthYear(left)
  if (!start) return null
  if (PRESENT_PATTERN.test(right)) return { start, end: null, isCurrent: true }
  const end = parseMonthYear(right)
  if (!end) return null
  return { start, end, isCurrent: false }
}

function splitList(line: string): string[] {
  return line
    .split(/[,;|]|\s{2,}/)
    .map((item) => item.replace(/^[-–—\s]+/, '').trim())
    .filter((item) => item.length > 1 && item.length <= 80)
}

function parseEducationBlock(lines: string[]): ParsedEducation[] {
  const entries: ParsedEducation[] = []
  for (const line of lines) {
    if (!QUALIFICATION_PATTERN.test(line)) continue
    const qualificationMatch = line.match(QUALIFICATION_PATTERN)
    const yearMatches = [...line.matchAll(/\b(\d{4})\b/g)]
      .map((match) => parseYear(match[1]))
      .filter((year): year is number => year !== null)

    // "BSc Public Health, University of Ibadan, 2017" — the field of study sits
    // between the qualification and the institution.
    const afterQualification = line.slice((qualificationMatch?.index ?? 0) + (qualificationMatch?.[0].length ?? 0))
    const parts = afterQualification.split(/[,–—|]/).map((part) => part.trim()).filter(Boolean)
    const institutionPart = parts.find((part) => /\b(university|college|polytechnic|institute|school|academy)\b/i.test(part))
    const fieldPart = parts.find((part) => part !== institutionPart && !/^\d{4}$/.test(part) && part.length > 2)

    entries.push({
      institution: institutionPart ?? null,
      qualification: qualificationMatch ? qualificationMatch[0] : null,
      fieldOfStudy: fieldPart?.replace(/^(in|of)\s+/i, '') ?? null,
      completionYear: yearMatches.length ? Math.max(...yearMatches) : null,
    })
  }
  return entries
}

function parseEmploymentBlock(lines: string[]): ParsedEmployment[] {
  const entries: ParsedEmployment[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const range = parseDateRange(lines[index])
    if (!range) continue

    // The role and employer are usually on the date line itself or the line
    // immediately before it.
    const dateLine = lines[index]
    const previous = index > 0 ? lines[index - 1] : ''
    const withoutDates = dateLine
      .replace(/\b[a-z]{3}[a-z]*\.?\s+\d{4}\b/gi, '')
      .replace(/\b\d{1,2}[\/.]\d{4}\b/g, '')
      .replace(/\b\d{4}\b/g, '')
      .replace(PRESENT_PATTERN, '')
      .replace(/\s[–—−-]{1,2}\s|\s+(?:to|until)\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[,\-–—|]+|[,\-–—|]+$/g, '')
      .trim()

    const source = withoutDates.length > 3 ? withoutDates : previous
    const segments = source.split(/\s+(?:at|,|–|—|\|)\s+/i).map((part) => part.trim()).filter(Boolean)

    entries.push({
      jobTitle: segments[0] || null,
      employer: segments[1] || null,
      startDate: range.start,
      endDate: range.end,
      isCurrent: range.isCurrent,
    })
  }
  return entries
}

/** Total experience implied by the parsed roles, merging overlaps. */
function estimateExperienceYears(employment: ParsedEmployment[]): number | null {
  const toTime = (value: string | null, fallback: number): number => {
    if (!value) return fallback
    const [year, month] = value.split('-')
    return Date.UTC(Number(year), month ? Number(month) - 1 : 0)
  }
  const now = Date.now()
  const spans = employment
    .map((item) => [toTime(item.startDate, NaN), item.isCurrent ? now : toTime(item.endDate, NaN)] as const)
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0])
  if (!spans.length) return null
  const merged: Array<[number, number]> = []
  for (const span of spans) {
    const last = merged.at(-1)
    if (!last || span[0] > last[1]) merged.push([span[0], span[1]])
    else last[1] = Math.max(last[1], span[1])
  }
  const years = merged.reduce((total, [start, end]) => total + (end - start), 0) / (365.25 * 86_400_000)
  return Math.round(years * 10) / 10
}

/**
 * Parse plain text extracted from a CV.
 *
 * Text extraction from PDF/DOCX happens in `cv-extract.ts`; this function is
 * pure so it can be tested against fixture text.
 */
export function parseCvText(text: string): ParsedCv {
  const lines = toLines(text)

  const sections = new Map<SectionKey, string[]>()
  let currentSection: SectionKey | null = null
  const preamble: string[] = []
  for (const line of lines) {
    const detected = detectSection(line)
    if (detected) {
      currentSection = detected
      if (!sections.has(detected)) sections.set(detected, [])
      continue
    }
    if (currentSection) sections.get(currentSection)!.push(line)
    else preamble.push(line)
  }

  const educationLines = sections.get('education') ?? []
  const employmentLines = sections.get('employment') ?? []

  // Some CVs have no headings at all. Rather than return nothing, fall back to
  // scanning the whole document for the patterns each parser recognises.
  const education = parseEducationBlock(educationLines.length ? educationLines : lines)
  const employment = parseEmploymentBlock(employmentLines.length ? employmentLines : lines)

  const skills = (sections.get('skills') ?? []).flatMap(splitList).slice(0, 50)
  const certifications = (sections.get('certifications') ?? []).flatMap(splitList).slice(0, 30)
  const languages = (sections.get('languages') ?? []).flatMap(splitList).slice(0, 20)
  const memberships = (sections.get('memberships') ?? []).flatMap(splitList).slice(0, 20)

  const found = [
    extractName(preamble.length ? preamble : lines) !== null,
    extractEmail(text) !== null,
    extractPhone(text) !== null,
    education.length > 0,
    employment.length > 0,
    skills.length > 0,
  ]
  const confidence = Math.round((found.filter(Boolean).length / found.length) * 1000) / 1000

  return {
    fullName: extractName(preamble.length ? preamble : lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    education,
    employment,
    skills,
    certifications,
    languages,
    professionalMemberships: memberships,
    totalExperienceYears: estimateExperienceYears(employment),
    confidence,
  }
}
