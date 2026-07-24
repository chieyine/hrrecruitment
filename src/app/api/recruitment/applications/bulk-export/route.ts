import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { rowsToCsv } from '@/lib/export-files'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requirePermission('report.export')
    const ids = [...new Set((new URL(request.url).searchParams.get('ids') || '').split(',').filter(Boolean))].slice(0, 100)
    if (!ids.length) throw new AuthzError('Select at least one application', 400)
    const records = await prisma.application.findMany({ where: { id: { in: ids } }, include: { candidate: { include: { user: { select: { email: true, phone: true } } } }, vacancy: true }, orderBy: { updatedAt: 'desc' } })
    if (records.length !== ids.length) throw new AuthzError('One or more applications were not found', 404)
    const csv = rowsToCsv(records.map((record) => ({ Candidate: `${record.candidate.legalFirstName} ${record.candidate.lastName}`, Email: record.candidate.user.email, Phone: record.candidate.primaryPhone || record.candidate.user.phone || '', Vacancy: record.vacancy.title, Reference: record.vacancy.referenceNumber, 'Internal stage': record.internalStatus, 'Candidate status': record.candidateVisibleStatus, Submitted: record.submittedAt || '', 'Last updated': record.updatedAt })))
    const run = await prisma.bulkActionRun.create({ data: { actionType: 'EXPORT', requestedBy: user.userId, requestedCount: ids.length, eligibleCount: records.length, failedCount: 0, status: 'COMPLETED', requestJson: JSON.stringify({ ids }), resultJson: JSON.stringify({ rows: records.length }) } })
    await logAudit({ actorUserId: user.userId, action: 'BULK_APPLICATION_EXPORT', resourceType: 'BulkActionRun', resourceId: run.id, newValue: { applicationIds: ids } })
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="selected-applications-${new Date().toISOString().slice(0, 10)}.csv"` } })
  } catch (error) {
    return authzResponse(error)
  }
}
