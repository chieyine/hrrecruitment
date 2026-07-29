import { prisma } from '@/lib/prisma'
import { requireStaff, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere } from '@/lib/recruitment-access'
import { searchVacancies, searchCandidates, searchCandidatesBySkill, hasFullTextSearch } from '@/lib/search'

export const dynamic = 'force-dynamic'

/**
 * Staff search across applications, vacancies and candidate skills.
 *
 * Where migration 0006 has been applied this ranks results with PostgreSQL
 * full-text search; otherwise it degrades to the previous `contains` behaviour
 * so search still works on an un-migrated database.
 *
 * Access scoping is applied AFTER ranking: the ranked query finds candidates
 * and vacancies by relevance, and the caller's permissions then decide which of
 * those they may actually see.
 */
export async function GET(request: Request) {
  try {
    const user = await requireStaff()
    const query = (new URL(request.url).searchParams.get('q') || '').trim()
    if (query.length < 2) throw new AuthzError('Enter at least two characters', 400)
    if (query.length > 100) throw new AuthzError('Search is too long', 400)

    const [readAllApplications, readAssignedApplications, readAllVacancies, readAssignedVacancies] = await Promise.all([
      hasPermission(user.userId, 'application.read.all'),
      hasPermission(user.userId, 'application.read.assigned'),
      hasPermission(user.userId, 'vacancy.read.all'),
      hasPermission(user.userId, 'vacancy.read.assigned'),
    ])

    const applicationScope = readAllApplications
      ? {}
      : readAssignedApplications
        ? assignedApplicationWhere(user.userId)
        : null
    const vacancyScope = readAllVacancies ? {} : readAssignedVacancies ? { ownerUserId: user.userId } : null

    const ranked = await hasFullTextSearch()

    // --- candidate / application matches ---
    let applicationWhere: Record<string, unknown> | null = null
    if (applicationScope) {
      if (ranked) {
        const [candidateHits, skillHits, vacancyHits] = await Promise.all([
          searchCandidates(query, { limit: 100 }),
          searchCandidatesBySkill(query, { limit: 100 }),
          searchVacancies(query, { limit: 100 }),
        ])
        const candidateIds = [...new Set([...candidateHits.map((hit) => hit.id), ...skillHits.map((hit) => hit.id)])]
        const vacancyIds = vacancyHits.map((hit) => hit.id)
        applicationWhere = {
          AND: [
            applicationScope,
            {
              OR: [
                ...(candidateIds.length ? [{ candidateId: { in: candidateIds } }] : []),
                ...(vacancyIds.length ? [{ vacancyId: { in: vacancyIds } }] : []),
                { candidate: { primaryPhone: { contains: query } } },
                { candidate: { alternatePhone: { contains: query } } },
                { candidate: { user: { email: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { referenceNumber: { contains: query, mode: 'insensitive' } } },
                { vacancy: { project: { name: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { department: { name: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { dutyStation: { name: { contains: query, mode: 'insensitive' } } } },
                { erpTransferRecord: { erpPersonnelNumber: { contains: query, mode: 'insensitive' } } },
              ],
            },
          ],
        }
      } else {
        applicationWhere = {
          AND: [
            applicationScope,
            {
              OR: [
                { candidate: { legalFirstName: { contains: query, mode: 'insensitive' } } },
                { candidate: { lastName: { contains: query, mode: 'insensitive' } } },
                { candidate: { primaryPhone: { contains: query } } },
                { candidate: { alternatePhone: { contains: query } } },
                { candidate: { user: { email: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { referenceNumber: { contains: query, mode: 'insensitive' } } },
                { vacancy: { title: { contains: query, mode: 'insensitive' } } },
                { vacancy: { project: { name: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { department: { name: { contains: query, mode: 'insensitive' } } } },
                { vacancy: { dutyStation: { name: { contains: query, mode: 'insensitive' } } } },
                { erpTransferRecord: { erpPersonnelNumber: { contains: query, mode: 'insensitive' } } },
              ],
            },
          ],
        }
      }
    }

    // --- vacancy matches ---
    let vacancyIdsByRank: string[] = []
    if (vacancyScope && ranked) {
      vacancyIdsByRank = (await searchVacancies(query, { limit: 50 })).map((hit) => hit.id)
    }

    const [applications, vacancies] = await Promise.all([
      applicationWhere
        ? prisma.application.findMany({
            where: applicationWhere,
            include: {
              candidate: { include: { user: { select: { email: true } } } },
              vacancy: { include: { project: true, department: true, dutyStation: true } },
              erpTransferRecord: true,
            },
            take: 50,
            orderBy: { updatedAt: 'desc' },
          })
        : Promise.resolve([]),
      vacancyScope
        ? prisma.vacancy.findMany({
            where: ranked
              ? {
                  AND: [
                    vacancyScope,
                    {
                      OR: [
                        ...(vacancyIdsByRank.length ? [{ id: { in: vacancyIdsByRank } }] : []),
                        { referenceNumber: { contains: query, mode: 'insensitive' } },
                        { project: { name: { contains: query, mode: 'insensitive' } } },
                        { department: { name: { contains: query, mode: 'insensitive' } } },
                        { dutyStation: { name: { contains: query, mode: 'insensitive' } } },
                      ],
                    },
                  ],
                }
              : {
                  AND: [
                    vacancyScope,
                    {
                      OR: [
                        { referenceNumber: { contains: query, mode: 'insensitive' } },
                        { title: { contains: query, mode: 'insensitive' } },
                        { project: { name: { contains: query, mode: 'insensitive' } } },
                        { department: { name: { contains: query, mode: 'insensitive' } } },
                        { dutyStation: { name: { contains: query, mode: 'insensitive' } } },
                      ],
                    },
                  ],
                },
            include: { project: true, department: true, dutyStation: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    // Restore relevance order, which the Prisma `in` lookup does not preserve.
    const rankPosition = new Map(vacancyIdsByRank.map((id, index) => [id, index]))
    const orderedVacancies = ranked
      ? [...vacancies].sort(
          (a, b) =>
            (rankPosition.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (rankPosition.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
            a.referenceNumber.localeCompare(b.referenceNumber)
        )
      : vacancies

    const maySeeContact = readAllApplications && !user.roles.includes('AUDITOR')

    return Response.json({
      query,
      ranked,
      applications: applications.map((record) => ({
        id: record.id,
        name: `${record.candidate.legalFirstName} ${record.candidate.lastName}`,
        email: maySeeContact ? record.candidate.user.email : null,
        phone: maySeeContact ? record.candidate.primaryPhone : null,
        status: record.internalStatus,
        vacancy: record.vacancy.title,
        reference: record.vacancy.referenceNumber,
        project: record.vacancy.project?.name,
        department: record.vacancy.department.name,
        dutyStation: record.vacancy.dutyStation.name,
        erpPersonnelNumber: record.erpTransferRecord?.erpPersonnelNumber || null,
      })),
      vacancies: orderedVacancies.map((record) => ({
        id: record.id,
        title: record.title,
        reference: record.referenceNumber,
        status: record.status,
        project: record.project?.name,
        department: record.department.name,
        dutyStation: record.dutyStation.name,
      })),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
