export function textPdf(title: string, paragraphs: string[]) {
  const safe = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?')
  const lines = paragraphs.flatMap((paragraph) => {
    const words = paragraph.replace(/\s+/g, ' ').trim().split(' ')
    const wrapped: string[] = []
    let current = ''
    for (const word of words) {
      if (`${current} ${word}`.trim().length > 90) {
        if (current) wrapped.push(current)
        current = word
      } else current = `${current} ${word}`.trim()
    }
    if (current) wrapped.push(current)
    return [...wrapped, '']
  })
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 40)) }, (_, index) =>
    lines.slice(index * 40, index * 40 + 40)
  )
  const fontObject = 3 + pages.length * 2
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]
  pages.forEach((page, index) => {
    const pageObject = 3 + index * 2
    const streamObject = pageObject + 1
    const heading = index ? `${title} - continued` : title
    const stream = [
      `BT /F1 16 Tf 55 790 Td (${safe(heading)}) Tj`,
      ...page.map((line) => `0 -17 Td /F1 9 Tf (${safe(line)}) Tj`),
      `ET`,
    ].join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${streamObject} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
    )
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let output = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output))
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(output)
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}

type BrandedPdfLine = {
  text: string
  style: 'title' | 'heading' | 'body' | 'label' | 'space'
}

export type BrandedPdfSection = {
  heading: string
  rows: Array<[label: string, value: string]>
}

/**
 * A generic branded, sectioned A4 document.
 *
 * Used for the §19.3 ERP handover pack, where the whole point is that a person
 * reads the values off the page and keys them into the ERP: the layout is
 * label/value rows rather than prose, and long values wrap rather than truncate.
 */
export function brandedPdf(input: {
  title: string
  subtitle?: string
  reference: string
  sections: BrandedPdfSection[]
  footerNote?: string
}) {
  const content: BrandedPdfLine[] = [
    { text: input.title, style: 'title' },
    { text: `Reference ${input.reference}  |  Generated ${new Date().toLocaleDateString('en-GB')}`, style: 'label' },
  ]
  if (input.subtitle) content.push({ text: input.subtitle, style: 'heading' })
  content.push({ text: '', style: 'space' })

  for (const section of input.sections) {
    content.push({ text: section.heading, style: 'heading' })
    for (const [label, value] of section.rows) {
      // Values are wrapped independently of the label so a long address does not
      // push the label off the line.
      const wrapped = wrapPdfText(String(value ?? ''), 68)
      content.push({ text: `${label}:  ${wrapped[0] ?? ''}`, style: 'body' })
      for (const continuation of wrapped.slice(1))
        content.push({ text: `        ${continuation}`, style: 'body' })
    }
    content.push({ text: '', style: 'space' })
  }

  return renderBrandedPdf(content, input.footerNote ?? 'FRAD Foundation  |  Confidential')
}

function wrapPdfText(value: string, width: number) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      if (current) lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * A restrained A4 document used for candidate-facing employment records.
 * It intentionally uses built-in PDF fonts so the generated offer remains
 * portable and deterministic without a browser or external rendering service.
 */
export function offerPdf(input: {
  reference: string
  issuedAt: Date
  documentStatus?: 'PREVIEW' | 'ISSUED'
  candidateName: string
  position: string
  body: string
  terms: Array<{ label: string; value: string }>
  conditions?: string | null
  responseDeadline: Date
}) {
  const content: BrandedPdfLine[] = [
    { text: 'Offer of employment', style: 'title' },
    {
      text: `${input.documentStatus === 'PREVIEW' ? 'Prepared for approval' : 'Issued'} ${input.issuedAt.toLocaleDateString('en-GB')}  |  Reference ${input.reference}`,
      style: 'label',
    },
    ...(input.documentStatus === 'PREVIEW'
      ? ([{ text: 'DRAFT | NOT YET ISSUED', style: 'label' }] satisfies BrandedPdfLine[])
      : []),
    { text: '', style: 'space' },
    { text: input.candidateName, style: 'heading' },
    { text: input.position, style: 'label' },
    { text: '', style: 'space' },
  ]

  for (const paragraph of input.body
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean)) {
    content.push(...wrapPdfText(paragraph, 92).map((text) => ({ text, style: 'body' as const })))
    content.push({ text: '', style: 'space' })
  }

  content.push({ text: 'Key terms', style: 'heading' })
  for (const term of input.terms.filter((item) => item.value.trim())) {
    const prefix = `${term.label}: `
    const wrapped = wrapPdfText(`${prefix}${term.value}`, 88)
    content.push(...wrapped.map((text) => ({ text, style: 'body' as const })))
  }

  if (input.conditions?.trim()) {
    content.push({ text: '', style: 'space' }, { text: 'Conditions', style: 'heading' })
    content.push(
      ...wrapPdfText(input.conditions, 92).map((text) => ({
        text,
        style: 'body' as const,
      }))
    )
  }

  content.push(
    { text: '', style: 'space' },
    {
      text: `Please record your response by ${input.responseDeadline.toLocaleDateString('en-GB')}.`,
      style: 'body',
    },
    { text: '', style: 'space' },
    { text: 'For FRAD Foundation', style: 'heading' },
    { text: 'People and Operations', style: 'label' }
  )

  return renderBrandedPdf(content, 'FRAD Foundation  |  Confidential candidate document')
}

/**
 * Shared page layout and PDF serialisation for every branded document.
 *
 * Extracted so the offer letter and the ERP handover pack cannot drift apart in
 * pagination or styling — there is one implementation of "what a FRAD document
 * looks like", not two.
 */
function renderBrandedPdf(content: BrandedPdfLine[], footerNote: string) {
  const safe = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?')
  const lineHeight = (line: BrandedPdfLine) =>
    line.style === 'space' ? 8 : line.style === 'title' ? 31 : line.style === 'heading' ? 20 : 15
  const pageCapacity = 650
  const pages: BrandedPdfLine[][] = []
  let page: BrandedPdfLine[] = []
  let usedHeight = 0
  for (let index = 0; index < content.length; index++) {
    const line = content[index]
    const height = lineHeight(line)
    // Keep a heading with at least the first line that follows it.
    const requiredHeight =
      line.style === 'heading' && content[index + 1] ? height + lineHeight(content[index + 1]) : height
    if (page.length && usedHeight + requiredHeight > pageCapacity) {
      pages.push(page)
      page = []
      usedHeight = 0
    }
    page.push(line)
    usedHeight += height
  }
  if (page.length || !pages.length) pages.push(page)
  const regularFontObject = 3 + pages.length * 2
  const boldFontObject = regularFontObject + 1
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((page, index) => {
    const pageObject = 3 + index * 2
    const streamObject = pageObject + 1
    let y = 742
    const operations = [
      '0.027 0.145 0.216 rg 0 780 595 62 re f',
      `BT /FB 16 Tf 1 1 1 rg 1 0 0 1 48 811 Tm (FRAD FOUNDATION) Tj ET`,
      `BT /FR 8 Tf 0.82 0.9 0.94 rg 1 0 0 1 48 794 Tm (RECRUITMENT  |  CONFIDENTIAL) Tj ET`,
    ]

    for (const line of page) {
      if (line.style === 'space') {
        y -= 8
        continue
      }
      const font = line.style === 'body' || line.style === 'label' ? 'FR' : 'FB'
      const size = line.style === 'title' ? 22 : line.style === 'heading' ? 11 : line.style === 'label' ? 8 : 9.5
      const colour =
        line.style === 'label'
          ? '0.34 0.39 0.44 rg'
          : line.style === 'title'
            ? '0.027 0.145 0.216 rg'
            : '0.11 0.14 0.18 rg'
      operations.push(`BT /${font} ${size} Tf ${colour} 1 0 0 1 54 ${y} Tm (${safe(line.text)}) Tj ET`)
      y -= line.style === 'title' ? 31 : line.style === 'heading' ? 20 : 15
    }

    operations.push(
      '0.82 0.84 0.86 RG 0.5 w 54 52 m 541 52 l S',
      `BT /FR 7.5 Tf 0.4 0.43 0.46 rg 1 0 0 1 54 36 Tm (${safe(footerNote)}) Tj ET`,
      `BT /FR 7.5 Tf 0.4 0.43 0.46 rg 1 0 0 1 484 36 Tm (Page ${index + 1} of ${pages.length}) Tj ET`
    )
    const stream = operations.join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /FR ${regularFontObject} 0 R /FB ${boldFontObject} 0 R >> >> /Contents ${streamObject} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
    )
  })
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  )

  let output = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output))
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(output)
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}
