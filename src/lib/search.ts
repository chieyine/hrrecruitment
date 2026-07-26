import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/**
 * PostgreSQL full-text search over vacancies and candidates.
 *
 * Migration 0006 adds a generated, weighted `searchVector` column plus a GIN
 * index to both tables, and pg_trgm indexes for the fallback. The previous
 * implementation was an unindexed `contains` scan with no relevance ranking and
 * no coverage of candidate names or skills — the things recruiters actually
 * search for.
 *
 * The ranked query is raw SQL because Prisma cannot express `tsquery`, `ts_rank`
 * or a generated tsvector column. It is parameterised throughout; no caller
 * input is ever interpolated.
 */

/** Turn free text into a prefix-matching tsquery: `hea eng` -> `hea:* & eng:*`. */
export function toTsQuery(input: string): string {
  const terms = input
    .toLowerCase()
    // Keep only what can appear inside a lexeme; strip tsquery operators so a
    // stray `&` or `!` cannot change the query's meaning.
    .replace(/[^\p{L}\p{N}\s@.'-]/gu, ' ')
    .split(/\s+/)
    .map((term) => term.replace(/^['-]+|['-]+$/g, ''))
    .filter((term) => term.length >= 2)
    .slice(0, 12)
  return terms.map((term) => `${term}:*`).join(' & ')
}

export interface VacancySearchHit {
  id: string
  referenceNumber: string
  title: string
  summary: string
  status: string
  closingAt: Date
  rank: number
}

export interface CandidateSearchHit {
  id: string
  legalFirstName: string
  lastName: string
  primaryPhone: string | null
  email: string
  rank: number
}

/**
 * Rank vacancies by relevance. `onlyOpen` restricts to the live, public set —
 * the careers site must never surface a draft.
 */
export async function searchVacancies(
  term: string,
  { limit = 50, onlyOpen = false }: { limit?: number; onlyOpen?: boolean } = {}
): Promise<VacancySearchHit[]> {
  const query = toTsQuery(term)
  if (!query) return []
  const now = new Date()

  const openFilter = onlyOpen
    ? Prisma.sql`AND v."status" = 'OPEN' AND v."openingAt" <= ${now} AND v."closingAt" >= ${now}`
    : Prisma.empty

  return prisma.$queryRaw<VacancySearchHit[]>`
    SELECT v."id", v."referenceNumber", v."title", v."summary", v."status", v."closingAt",
           ts_rank(v."searchVector", to_tsquery('english', ${query})) AS "rank"
    FROM "Vacancy" v
    WHERE v."searchVector" @@ to_tsquery('english', ${query})
    ${openFilter}
    ORDER BY "rank" DESC, v."closingAt" ASC
    LIMIT ${limit}
  `
}

/** Rank candidates by relevance across name and phone. */
export async function searchCandidates(term: string, { limit = 50 } = {}): Promise<CandidateSearchHit[]> {
  const query = toTsQuery(term)
  if (!query) return []

  return prisma.$queryRaw<CandidateSearchHit[]>`
    SELECT c."id", c."legalFirstName", c."lastName", c."primaryPhone", u."email",
           ts_rank(c."searchVector", to_tsquery('english', ${query})) AS "rank"
    FROM "CandidateProfile" c
    JOIN "User" u ON u."id" = c."userId"
    WHERE c."searchVector" @@ to_tsquery('english', ${query})
      AND u."accountStatus" = 'ACTIVE'
    ORDER BY "rank" DESC, c."lastName" ASC
    LIMIT ${limit}
  `
}

/**
 * Candidates matching a skill, certification or language.
 *
 * These live in child tables so they are not part of the parent's tsvector;
 * a trigram-backed ILIKE is the right tool and is genuinely indexed.
 */
export async function searchCandidatesBySkill(term: string, { limit = 50 } = {}) {
  const needle = term.trim().slice(0, 100)
  if (needle.length < 2) return []

  return prisma.candidateProfile.findMany({
    where: {
      user: { accountStatus: 'ACTIVE' },
      OR: [
        { skills: { some: { name: { contains: needle, mode: 'insensitive' } } } },
        { certifications: { some: { name: { contains: needle, mode: 'insensitive' } } } },
        { languages: { some: { language: { contains: needle, mode: 'insensitive' } } } },
      ],
    },
    select: {
      id: true,
      legalFirstName: true,
      lastName: true,
      user: { select: { email: true } },
      skills: { select: { name: true }, take: 10 },
    },
    orderBy: { lastName: 'asc' },
    take: limit,
  })
}

/**
 * Whether the full-text columns are present.
 *
 * They are created by migration 0006, and the ranked queries fail without them.
 * Callers use this to fall back to a `contains` search so search degrades
 * rather than erroring on a database that has not been migrated yet.
 */
let fullTextAvailable: boolean | null = null

export async function hasFullTextSearch(): Promise<boolean> {
  if (fullTextAvailable !== null) return fullTextAvailable
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count
      FROM information_schema.columns
      WHERE table_name = 'Vacancy' AND column_name = 'searchVector'
    `
    fullTextAvailable = Number(rows[0]?.count ?? 0) > 0
  } catch {
    fullTextAvailable = false
  }
  return fullTextAvailable
}
