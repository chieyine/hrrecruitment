import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function xml(value: unknown) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function crc32(data: Buffer) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)) } return (crc ^ 0xffffffff) >>> 0 }
function zip(files: Array<[string, string]>) {
  const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0
  for (const [nameValue, content] of files) {
    const name = Buffer.from(nameValue); const data = Buffer.from(content); const crc = crc32(data)
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26)
    locals.push(local, name, data)
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42)
    centrals.push(central, name); offset += local.length + name.length + data.length
  }
  const centralData = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralData, end])
}
function xlsx(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] || { Reference: '', Vacancy: '', Department: '', 'Duty Station': '', Status: '', Applicants: '', Submitted: '', Hired: '' })
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))].map((row, index) => `<row r="${index + 1}">${row.map((value, column) => `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`).join('')}</row>`).join('')
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="FRAD Report" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${headers.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="24" customWidth="1"/>`).join('')}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}${Math.max(rows.length + 1, 1)}"/></worksheet>`],
  ])
}
function pdf(title: string, lines: string[]) {
  const safe = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?')
  const wrapped = lines.flatMap((line) => {
    const words = line.split(/\s+/); const output: string[] = []; let current = ''
    for (const word of words) {
      if (`${current} ${word}`.trim().length > 145) { if (current) output.push(current); current = word }
      else current = `${current} ${word}`.trim()
    }
    if (current) output.push(current)
    return output
  })
  const chunks = wrapped.length ? Array.from({ length: Math.ceil(wrapped.length / 28) }, (_, index) => wrapped.slice(index * 28, index * 28 + 28)) : [[]]
  const fontObject = 3 + chunks.length * 2
  const pageObjects = chunks.map((_, index) => 3 + index * 2)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjects.map((number) => `${number} 0 R`).join(' ')}] /Count ${chunks.length} >>`,
  ]
  chunks.forEach((chunk, index) => {
    const pageNumber = 3 + index * 2
    const streamNumber = pageNumber + 1
    const heading = index === 0 ? title : `${title} (continued ${index + 1})`
    const text = [`BT /F1 16 Tf 40 555 Td (${safe(heading)}) Tj`, ...chunk.map((line) => `0 -17 Td /F1 7 Tf (${safe(line)}) Tj`), `0 -22 Td /F1 7 Tf (Page ${index + 1} of ${chunks.length}) Tj`, 'ET'].join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${streamNumber} 0 R >>`,
      `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    )
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let output = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(output); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}

const REPORT_TYPES = new Set(['pipeline','candidate-stages','assessments','interviews','references','offers','preboarding','outstanding','courses','readiness','resumption','erp','waivers','work-items','communications','approvals','audit','complaints','privacy-deletions','configuration-changes','delivery','data-quality'])

function csv(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] || { Message: '' })
  return [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\r\n')
}

async function reportRows(type: string, options: { includeContact?: boolean } = {}): Promise<Record<string, unknown>[]> {
  if (type === 'pipeline') {
    const records = await prisma.vacancy.findMany({ include: { department: true, dutyStation: true, applications: { select: { internalStatus: true } } }, orderBy: { referenceNumber: 'asc' } })
    return records.map((vacancy) => ({ Reference: vacancy.referenceNumber, Vacancy: vacancy.title, Department: vacancy.department.name, 'Duty Station': vacancy.dutyStation.name, Status: vacancy.status, Applicants: vacancy.applications.length, Submitted: vacancy.applications.filter((application) => application.internalStatus !== 'DRAFT').length, Hired: vacancy.applications.filter((application) => ['RESUMED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)).length }))
  }
  if (type === 'candidate-stages') {
    const records = await prisma.application.findMany({ include: { candidate: { include: { user: { select: { email: true } } } }, vacancy: true }, orderBy: { updatedAt: 'desc' } })
    return records.map((record)=>({Candidate:`${record.candidate.legalFirstName} ${record.candidate.lastName}`,...(options.includeContact ? { Email: record.candidate.user.email } : {}),Vacancy:record.vacancy.title,Reference:record.vacancy.referenceNumber,'Internal Stage':record.internalStatus,'Candidate Status':record.candidateVisibleStatus,'Updated At':record.updatedAt.toISOString()}))
  }
  if (type === 'assessments') {
    const records=await prisma.candidateAssessment.findMany({include:{assessment:true,application:{include:{candidate:true,vacancy:true}}},orderBy:{invitedAt:'desc'}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Assessment:record.assessment.title,Type:record.assessment.type,Status:record.status,Score:record.score??'',Passed:record.passed??'',Invited:record.invitedAt.toISOString(),Submitted:record.submittedAt?.toISOString()||''}))
  }
  if(type==='interviews'){
    const records=await prisma.interview.findMany({include:{application:{include:{candidate:true,vacancy:true}},panelMembers:true,panelSubmissions:true},orderBy:{scheduledStart:'desc'}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Interview:record.title,Format:record.format,Status:record.status,Scheduled:record.scheduledStart.toISOString(),'Panel Members':record.panelMembers.length,'Submitted Scores':record.panelSubmissions.length}))
  }
  if(type==='references'){
    const records=await prisma.referee.findMany({include:{application:{include:{candidate:true,vacancy:true}},requests:{include:{response:true},orderBy:{sentAt:'desc'},take:1}}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Referee:record.name,Organization:record.organization,Relationship:record.relationship,Status:record.requests[0]?.response?.outcome||record.requests[0]?.status||'NOT_SENT'}))
  }
  if(type==='offers'){
    const records=await prisma.offer.findMany({include:{application:{include:{candidate:true,vacancy:true}}},orderBy:{sentAt:'desc'}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Position:record.position,Status:record.status,'Start Date':record.startDate.toISOString().slice(0,10),'Response Deadline':record.acceptanceDeadline.toISOString(),'Proposed Start':record.candidateProposedStartDate?.toISOString().slice(0,10)||''}))
  }
  if(['preboarding','outstanding'].includes(type)){
    const records=await prisma.candidatePreboarding.findMany({where:type==='outstanding'?{readinessStatus:{not:'READY_TO_RESUME'}}:{},include:{application:{include:{candidate:true,vacancy:true}},forms:true,documents:true,policyAcknowledgements:true,courses:true,tasks:true},orderBy:{startedAt:'desc'}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Status:record.status,Readiness:record.readinessStatus,Completion:`${record.overallCompletionPercentage}%`,'Outstanding Forms':record.forms.filter(item=>!['APPROVED','WAIVED'].includes(item.status)).length,'Outstanding Documents':record.documents.filter(item=>!['APPROVED','WAIVED'].includes(item.status)).length,'Outstanding Policies':record.policyAcknowledgements.filter(item=>!['SIGNED','APPROVED','WAIVED'].includes(item.status)).length,'Outstanding Courses':record.courses.filter(item=>!['COMPLETED','WAIVED'].includes(item.status)).length,'Outstanding Tasks':record.tasks.filter(item=>!['COMPLETED','APPROVED','WAIVED'].includes(item.status)).length}))
  }
  if(type==='courses'){
    const records=await prisma.candidateCourse.findMany({include:{course:true,candidatePreboarding:{include:{application:{include:{candidate:true,vacancy:true}}}}}})
    return records.map(record=>({Candidate:`${record.candidatePreboarding.application.candidate.legalFirstName} ${record.candidatePreboarding.application.candidate.lastName}`,Vacancy:record.candidatePreboarding.application.vacancy.title,Course:record.course.title,Status:record.status,Score:record.score??'',Attempts:record.attempts,Due:record.dueAt?.toISOString()||''}))
  }
  if(type==='readiness'||type==='waivers'){
    const records=await prisma.readinessCheck.findMany({where:type==='waivers'?{status:'WAIVED'}:{},include:{candidatePreboarding:{include:{application:{include:{candidate:true,vacancy:true}}}}}})
    return records.map(record=>({Candidate:`${record.candidatePreboarding.application.candidate.legalFirstName} ${record.candidatePreboarding.application.candidate.lastName}`,Vacancy:record.candidatePreboarding.application.vacancy.title,Check:record.checkType,Required:record.required,Status:record.status,'Waiver Reason':record.waiverReason||'',Reviewed:record.reviewedAt?.toISOString()||record.waivedAt?.toISOString()||''}))
  }
  if(type==='resumption'){
    const records=await prisma.resumptionRecord.findMany({include:{application:{include:{candidate:true,vacancy:true}}}})
    return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,Planned:record.plannedStartDate.toISOString().slice(0,10),Actual:record.actualStartDate?.toISOString().slice(0,10)||'',Location:record.reportingLocation,Outcome:record.outcome,'Supervisor Confirmed':record.supervisorConfirmation}))
  }
  if (type === 'work-items') {
    const records = await prisma.workItem.findMany({ include: { assignedUser: { select: { email: true } } }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }], take: 10000 })
    return records.map((record) => ({ Type: record.workType, Title: record.title, Status: record.status, Priority: record.priority, Assignee: record.assignedUser?.email || record.assignedRole || 'UNASSIGNED', Due: record.dueAt?.toISOString() || '', Blocked: record.blockedReason || '', Escalation: record.escalationLevel, Created: record.createdAt.toISOString(), Completed: record.completedAt?.toISOString() || '' }))
  }
  if (type === 'communications') {
    const records = await prisma.messageThread.findMany({ where: { restricted: false }, include: { application: { include: { candidate: true, vacancy: true } }, messages: { orderBy: { sentAt: 'asc' } } }, take: 10000 })
    return records.map((record) => ({ Candidate: `${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`, Vacancy: record.application.vacancy.title, Reference: record.application.vacancy.referenceNumber, Subject: record.subject, Category: record.category, Messages: record.messages.length, 'First message': record.messages[0]?.sentAt.toISOString() || '', 'Last message': record.messages.at(-1)?.sentAt.toISOString() || '', Unread: record.messages.filter((message) => !message.readAt).length }))
  }
  if (type === 'approvals') {
    const records = await prisma.approval.findMany({ orderBy: { createdAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ Type: record.resourceType, 'Resource ID': record.resourceId, Stage: record.stage, Decision: record.decision, Comment: record.comment || '', Requested: record.createdAt.toISOString(), Decided: record.decidedAt?.toISOString() || '', Approver: record.approverUserId, 'Requested by': record.requestedBy || '' }))
  }
  if (type === 'audit') {
    const records = await prisma.auditLog.findMany({ include: { actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ At: record.createdAt.toISOString(), Actor: record.actor?.email || 'System', Action: record.action, 'Resource type': record.resourceType, 'Resource ID': record.resourceId, Reason: record.reason || '', 'Request ID': record.requestId || '', 'Integrity hash': record.entryHash || '' }))
  }
  if (type === 'complaints') {
    const records = await prisma.complaintCase.findMany({ orderBy: { createdAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ Reference: record.referenceNumber, Category: record.category, Subject: record.subject, Confidentiality: record.confidentiality, Status: record.status, Priority: record.priority, Assigned: record.assignedToUserId || '', Due: record.dueAt?.toISOString() || '', Created: record.createdAt.toISOString(), Resolved: record.resolvedAt?.toISOString() || '', Resolution: record.resolution || '' }))
  }
  if (type === 'privacy-deletions') {
    const records = await prisma.dataDeletionRequest.findMany({ include: { candidate: { include: { user: { select: { email: true } } } } }, orderBy: { requestedAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ Candidate: `${record.candidate.legalFirstName} ${record.candidate.lastName}`, Email: record.candidate.user.email, Status: record.status, Reason: record.reason || '', Requested: record.requestedAt.toISOString(), Decided: record.decidedAt?.toISOString() || '', 'Decided by': record.decidedBy || '' }))
  }
  if (type === 'configuration-changes') {
    const records = await prisma.configurationChangeRequest.findMany({ orderBy: { requestedAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ Type: record.changeType, 'Resource ID': record.resourceId, Status: record.status, Reason: record.reason, Requested: record.requestedAt.toISOString(), 'Requested by': record.requestedBy, Decided: record.decidedAt?.toISOString() || '', 'Decided by': record.decidedBy || '', 'Decision comment': record.decisionComment || '', Applied: record.appliedAt?.toISOString() || '' }))
  }
  if (type === 'delivery') {
    const records = await prisma.outboxMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 10000 })
    return records.map((record) => ({ Channel: record.channel, Recipient: record.recipient, Subject: record.subject || '', Status: record.status, Attempts: record.attempts, 'Maximum attempts': record.maximumAttempts, Created: record.createdAt.toISOString(), Delivered: record.deliveredAt?.toISOString() || '', 'Last error': record.lastError || '' }))
  }
  if (type === 'data-quality') {
    const [candidates, unassigned, vacancies] = await Promise.all([
      prisma.candidateProfile.findMany({ include: { user: { select: { phone: true } } }, take: 5000 }),
      prisma.application.findMany({ where: { assignedReviewerId: null, internalStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }, include: { candidate: true, vacancy: true }, take: 5000 }),
      prisma.vacancy.findMany({ where: { status: { in: ['OPEN', 'APPROVED'] }, screeningScorecardTemplateId: null }, take: 5000 }),
    ])
    const phoneGroups = new Map<string, typeof candidates>()
    for (const candidate of candidates) {
      const phone = (candidate.primaryPhone || candidate.user.phone || '').replace(/\D/g, '')
      if (phone.length < 7) continue
      phoneGroups.set(phone, [...(phoneGroups.get(phone) || []), candidate])
    }
    return [
      ...[...phoneGroups.entries()].filter(([, group]) => group.length > 1).map(([phone, group]) => ({ Issue: 'POSSIBLE_DUPLICATE', Severity: 'HIGH', Record: group.map((candidate) => `${candidate.legalFirstName} ${candidate.lastName}`).join('; '), Details: `Shared phone ending ${phone.slice(-4)} across ${group.length} profiles` })),
      ...unassigned.map((record) => ({ Issue: 'UNASSIGNED_APPLICATION', Severity: 'HIGH', Record: `${record.candidate.legalFirstName} ${record.candidate.lastName}`, Details: `${record.vacancy.referenceNumber} · ${record.internalStatus}` })),
      ...vacancies.map((record) => ({ Issue: 'MISSING_SCORECARD', Severity: 'HIGH', Record: record.referenceNumber, Details: `${record.title} has no screening scorecard` })),
    ]
  }
  const records=await prisma.eRPTransferRecord.findMany({include:{application:{include:{candidate:true,vacancy:true}}}})
  return records.map(record=>({Candidate:`${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,Vacancy:record.application.vacancy.title,'ERP Personnel Number':record.erpPersonnelNumber,'Created In ERP':record.createdInErpAt.toISOString(),Status:record.status}))
}

function filterReportRows(rows: Record<string, unknown>[], params: URLSearchParams) {
  const vacancy = params.get('vacancy')?.trim().toLowerCase()
  const department = params.get('department')?.trim().toLowerCase()
  const status = params.get('status')?.trim().toLowerCase()
  const search = params.get('search')?.trim().toLowerCase()
  const dateFrom = params.get('dateFrom') ? new Date(params.get('dateFrom')!) : null
  const dateTo = params.get('dateTo') ? new Date(`${params.get('dateTo')}T23:59:59.999Z`) : null
  return rows.filter((row) => {
    const entries = Object.entries(row)
    const field = (name: string) => entries.filter(([key]) => key.toLowerCase().includes(name)).map(([, value]) => String(value ?? '').toLowerCase()).join(' ')
    const text = entries.map(([, value]) => String(value ?? '')).join(' ').toLowerCase()
    if (vacancy && !`${field('vacancy')} ${field('reference')}`.includes(vacancy)) return false
    if (department && !field('department').includes(department)) return false
    if (status && !field('status').includes(status)) return false
    if (search && !text.includes(search)) return false
    if (dateFrom || dateTo) {
      const dates = entries.map(([, value]) => new Date(String(value))).filter((date) => !Number.isNaN(date.getTime()))
      if (dateFrom && !dates.some((date) => date >= dateFrom)) return false
      if (dateTo && !dates.some((date) => date <= dateTo)) return false
    }
    return true
  })
}

export async function GET(request: Request) {
  try {
    const user = await requirePermission('report.export')
    const searchParams = new URL(request.url).searchParams
    const format = searchParams.get('format') || 'csv'
    const reportType = searchParams.get('report') || 'pipeline'
    const [canExportComplaints, canExportAudit, canExportGovernance, canExportReferences, canExportOffers, canExportPreboarding] = await Promise.all([
      hasPermission(user.userId, 'complaint.manage'),
      hasPermission(user.userId, 'audit.read'),
      hasPermission(user.userId, 'governance.manage'),
      hasPermission(user.userId, 'reference.manage'),
      hasPermission(user.userId, 'offer.manage'),
      hasPermission(user.userId, 'preboarding.manage'),
    ])
    const allowed = (type: string) => {
      if (user.roles.includes('AUDITOR') && !['complaints', 'configuration-changes'].includes(type)) return true
      if (type === 'complaints') return canExportComplaints
      if (type === 'audit') return canExportAudit
      if (type === 'configuration-changes') return canExportGovernance
      if (['privacy-deletions', 'delivery', 'data-quality'].includes(type)) return canExportGovernance
      if (type === 'references') return canExportReferences
      if (type === 'offers') return canExportOffers
      if (['preboarding', 'outstanding', 'courses', 'readiness', 'resumption', 'erp', 'waivers'].includes(type)) return canExportPreboarding
      return true
    }
    if (!['csv', 'xlsx', 'pdf', 'zip'].includes(format)) throw new AuthzError('Format must be csv, xlsx, pdf or zip', 400)
    if (reportType === 'all' && format !== 'zip') throw new AuthzError('The complete report pack is provided as a ZIP file', 400)
    if(reportType !== 'all' && !REPORT_TYPES.has(reportType))throw new AuthzError('Unknown report type',400)
    if (reportType === 'all') {
      const generatedAt = new Date().toISOString()
      const files: Array<[string, string]> = [
        ['README.txt', `FRAD recruitment documentation pack\nGenerated: ${generatedAt}\nGenerated by: ${user.email}\nClassification: INTERNAL - PERSONAL DATA\n\nThis pack contains point-in-time operational registers. Access, storage and disposal must follow FRAD privacy and retention rules.\n`],
      ]
      let totalRows = 0
      const includedTypes: string[] = []
      for (const type of REPORT_TYPES) {
        if (!allowed(type)) continue
        const report = await reportRows(type, { includeContact: canExportPreboarding || canExportOffers || canExportReferences })
        totalRows += report.length
        files.push([`${type}.csv`, csv(report)])
        includedTypes.push(type)
      }
      const body = new Uint8Array(zip(files))
      await logAudit({ actorUserId: user.userId, action: 'REPORT_PACK_EXPORTED', resourceType: 'RecruitmentReport', resourceId: 'all-zip', newValue: { format: 'zip', reportTypes: includedTypes, rowCount: totalRows } })
      return new Response(body, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="frad-recruitment-documentation-pack.zip"', 'Cache-Control': 'private, no-store' } })
    }
    if (!allowed(reportType)) throw new AuthzError('You do not have permission to export this restricted report', 403)
    const rows = filterReportRows(await reportRows(reportType, { includeContact: canExportPreboarding || canExportOffers || canExportReferences }), searchParams)
    let body: BodyInit; let contentType: string; const extension = format
    if (format === 'csv') {
      body = csv(rows)
      contentType = 'text/csv; charset=utf-8'
    } else if (format === 'xlsx') {
      body = new Uint8Array(xlsx(rows)); contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      const bytes = pdf(
        `FRAD ${reportType.replace(/-/g, ' ')} report`,
        rows.map((row) => Object.entries(row).map(([key, value]) => `${key}: ${String(value ?? '')}`).join(' | ')),
      )
      body = new Uint8Array(bytes); contentType = 'application/pdf'
    }
    await logAudit({ actorUserId: user.userId, action: 'REPORT_EXPORTED', resourceType: 'RecruitmentReport', resourceId: `${reportType}-${format}`, newValue: { format, reportType, rowCount: rows.length } })
    return new Response(body, { headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="frad-${reportType}.${extension}"`, 'Cache-Control': 'private, no-store' } })
  } catch (error) { return authzResponse(error) }
}
