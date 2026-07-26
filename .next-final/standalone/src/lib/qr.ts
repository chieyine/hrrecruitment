/**
 * Minimal QR code encoder producing an inline SVG.
 *
 * Scoped deliberately: byte mode, error-correction level M, versions 1–10,
 * which is enough for any `otpauth://` URI this application generates. It
 * exists so MFA enrolment can show a scannable code without adding a runtime
 * dependency for one screen.
 */

// --- Galois field arithmetic over GF(256) with the QR primitive 0x11d -------
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function generatorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= mul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

function reedSolomon(data: number[], eccCount: number): number[] {
  const poly = generatorPoly(eccCount)
  const remainder = new Array(eccCount).fill(0)
  for (const byte of data) {
    const factor = byte ^ remainder[0]
    remainder.shift()
    remainder.push(0)
    for (let i = 0; i < eccCount; i++) remainder[i] ^= mul(poly[i + 1], factor)
  }
  return remainder
}

// --- Version tables for error-correction level M ---------------------------
// [ total codewords, ecc codewords per block, group1 blocks, group2 blocks ]
const VERSIONS: Record<number, [number, number, number, number]> = {
  1: [26, 10, 1, 0],
  2: [44, 16, 1, 0],
  3: [70, 26, 1, 0],
  4: [100, 18, 2, 0],
  5: [134, 24, 2, 0],
  6: [172, 16, 4, 0],
  7: [196, 18, 4, 0],
  8: [242, 22, 2, 2],
  9: [292, 22, 3, 2],
  10: [346, 26, 4, 1],
}
const ALIGNMENT: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}
// Pre-computed BCH format strings for level M, masks 0-7.
const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0]

function capacity(version: number): number {
  const [total, ecc, g1, g2] = VERSIONS[version]
  return total - ecc * (g1 + g2)
}

export function encodeQrSvg(text: string, options: { size?: number; margin?: number } = {}): string {
  const bytes = Array.from(Buffer.from(text, 'utf8'))

  let version = 0
  for (let v = 1; v <= 10; v++) {
    // 4 bits mode + 8/16 bits length + payload, rounded up to whole codewords.
    const lengthBits = v < 10 ? 8 : 16
    if (capacity(v) * 8 >= 4 + lengthBits + bytes.length * 8) {
      version = v
      break
    }
  }
  if (!version) throw new Error('Payload too large for the supported QR versions (1-10)')

  const [, eccPerBlock, group1, group2] = VERSIONS[version]
  const blocks = group1 + group2
  const dataCapacity = capacity(version)

  // --- bit stream ---
  const bits: number[] = []
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1)
  }
  push(0b0100, 4) // byte mode
  push(bytes.length, version < 10 ? 8 : 16)
  for (const byte of bytes) push(byte, 8)
  push(0, Math.min(4, dataCapacity * 8 - bits.length)) // terminator
  while (bits.length % 8) bits.push(0)
  const codewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0))
  }
  const PAD = [0xec, 0x11]
  for (let i = 0; codewords.length < dataCapacity; i++) codewords.push(PAD[i % 2])

  // --- split into blocks, compute ECC, interleave ---
  const shortLength = Math.floor(dataCapacity / blocks)
  const dataBlocks: number[][] = []
  let cursor = 0
  for (let i = 0; i < blocks; i++) {
    const length = i < group1 ? shortLength : shortLength + 1
    dataBlocks.push(codewords.slice(cursor, cursor + length))
    cursor += length
  }
  const eccBlocks = dataBlocks.map((block) => reedSolomon(block, eccPerBlock))

  const finalCodewords: number[] = []
  const longest = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < longest; i++) {
    for (const block of dataBlocks) if (i < block.length) finalCodewords.push(block[i])
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const block of eccBlocks) finalCodewords.push(block[i])
  }

  // --- module matrix ---
  const size = version * 4 + 17
  const modules: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null))

  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r
        const cc = col + c
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        const edge = r === -1 || r === 7 || c === -1 || c === 7
        const ring = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        modules[rr][cc] = edge ? false : ring || core
      }
    }
  }
  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  for (const centre of ALIGNMENT[version]) {
    for (const other of ALIGNMENT[version]) {
      if (modules[centre]?.[other] !== null) continue
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          modules[centre + r][other + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0
  }
  modules[size - 8][8] = true // dark module

  const formatCells: [number, number][] = []
  for (let i = 0; i <= 5; i++) formatCells.push([8, i])
  formatCells.push([8, 7], [8, 8], [7, 8])
  for (let i = 9; i <= 14; i++) formatCells.push([14 - i, 8])
  const formatCells2: [number, number][] = []
  for (let i = 0; i <= 7; i++) formatCells2.push([size - 1 - i, 8])
  for (let i = 8; i <= 14; i++) formatCells2.push([8, size - 15 + i])
  for (const [r, c] of [...formatCells, ...formatCells2]) modules[r][c] = false

  // --- place data with mask 0 ((row + col) % 2 === 0) ---
  let bitIndex = 0
  const dataBits: number[] = []
  for (const codeword of finalCodewords) {
    for (let i = 7; i >= 0; i--) dataBits.push((codeword >> i) & 1)
  }
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5 // skip the vertical timing column
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step
      for (const col of [right, right - 1]) {
        if (modules[row][col] !== null) continue
        const bit = bitIndex < dataBits.length ? dataBits[bitIndex++] : 0
        modules[row][col] = (row + col) % 2 === 0 ? bit === 0 : bit === 1
      }
    }
    upward = !upward
  }

  const format = FORMAT_M[0]
  for (let i = 0; i < 15; i++) {
    const bit = ((format >> i) & 1) === 1
    const [r1, c1] = formatCells[i]
    const [r2, c2] = formatCells2[i]
    modules[r1][c1] = bit
    modules[r2][c2] = bit
  }

  // --- SVG ---
  const margin = options.margin ?? 4
  const pixels = options.size ?? 232
  const total = size + margin * 2
  const path: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) path.push(`M${c + margin} ${r + margin}h1v1h-1z`)
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}"`,
    ` viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img"`,
    ` aria-label="QR code for authenticator app enrolment">`,
    `<rect width="${total}" height="${total}" fill="#ffffff"/>`,
    `<path d="${path.join('')}" fill="#000000"/>`,
    `</svg>`,
  ].join('')
}
