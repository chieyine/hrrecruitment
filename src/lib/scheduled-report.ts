import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { textPdf } from '@/lib/simple-pdf'
import { REPORT_TYPE_VALUES, reportRows } from '@/lib/recruitment-reports.server'

function cell(value: unknown) {
  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function xml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function crc32(data: Buffer) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zip(files: Array<[string, string]>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [filename, content] of files) {
    const name = Buffer.from(filename)
    const data = Buffer.from(content)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

function workbook(rows: Record<string, unknown>[], headers: string[]) {
  const allRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
  const sheetRows = allRows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${xml(value instanceof Date ? value.toISOString() : typeof value === 'object' && value !== null ? JSON.stringify(value) : value)}</t></is></c>`).join('')}</row>`
    )
    .join('')
  return zip([
    [
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      'xl/workbook.xml',
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="FRAD Report" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ],
    [
      'xl/worksheets/sheet1.xml',
      `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}${Math.max(rows.length + 1, 1)}"/></worksheet>`,
    ],
  ])
}

async function assertScheduleOwnerStillAuthorized(userId: string, reportType: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, accountStatus: 'ACTIVE' },
    select: { userRoles: { select: { role: { select: { name: true } } } } },
  })
  if (!user || !(await hasPermission(userId, 'report.export')))
    throw new Error('Scheduled report owner is no longer authorized')
  const roles = user.userRoles.map((assignment) => assignment.role.name)
  if (roles.includes('AUDITOR') && !['complaints', 'configuration-changes'].includes(reportType)) return
  const restrictedPermission =
    reportType === 'complaints'
      ? 'complaint.manage'
      : reportType === 'audit'
        ? 'audit.read'
        : ['configuration-changes', 'privacy-deletions', 'delivery', 'data-quality'].includes(reportType)
          ? 'governance.manage'
          : reportType === 'references'
            ? 'reference.manage'
            : reportType === 'offers'
              ? 'offer.manage'
              : ['preboarding', 'outstanding', 'courses', 'readiness', 'resumption', 'erp', 'waivers'].includes(
                    reportType
                  )
                ? 'preboarding.manage'
                : null
  if (restrictedPermission && !(await hasPermission(userId, restrictedPermission)))
    throw new Error('Scheduled report owner no longer has access to this report')
}

export async function generateScheduledReportAttachment(reportType: string, format: string, userId: string) {
  if (!(REPORT_TYPE_VALUES as readonly string[]).includes(reportType)) throw new Error('Unknown scheduled report type')
  await assertScheduleOwnerStillAuthorized(userId, reportType)
  const records = await reportRows(reportType)
  const headers: string[] = [
    ...new Set<string>(records.flatMap((record: Record<string, unknown>) => Object.keys(record))),
  ]
  const csv = [
    headers.map(cell).join(','),
    ...records.map((record: Record<string, unknown>) => headers.map((header) => cell(record[header])).join(',')),
  ].join('\r\n')
  const base = `frad-${reportType}-scheduled`
  if (format === 'xlsx')
    return {
      content: workbook(records, headers),
      filename: `${base}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  if (format === 'pdf') {
    const lines = records.map((record: Record<string, unknown>) =>
      headers
        .map(
          (header) =>
            `${header}: ${record[header] instanceof Date ? (record[header] as Date).toISOString() : typeof record[header] === 'object' && record[header] !== null ? JSON.stringify(record[header]) : String(record[header] ?? '')}`
        )
        .join(' | ')
    )
    return {
      content: textPdf(`FRAD ${reportType.replace(/-/g, ' ')} report`, lines),
      filename: `${base}.pdf`,
      contentType: 'application/pdf',
    }
  }
  return { content: Buffer.from(csv), filename: `${base}.csv`, contentType: 'text/csv; charset=utf-8' }
}
