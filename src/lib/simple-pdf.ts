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
