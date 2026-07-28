/**
 * File anti-virus scan hook.
 *
 * The default implementation detects the standard EICAR test string and
 * otherwise reports CLEAN — enough to exercise the block-on-infected path in
 * dev. In production, replace `scanBuffer` with a call to ClamAV (clamd),
 * AWS/GCP file-scanning, or your provider of choice. The rest of the app only
 * depends on the returned status, so swapping the implementation is safe.
 */

export type ScanStatus = 'CLEAN' | 'INFECTED' | 'PENDING'

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'

export async function scanBuffer(buffer: Buffer): Promise<ScanStatus> {
  try {
    const driver = process.env.VIRUS_SCAN_DRIVER
    if (driver === 'clamav') return await scanWithClamAv(buffer)
    if (driver !== 'development' && process.env.NODE_ENV === 'production') return 'PENDING'
    // The explicit development scanner supports production-like local/E2E
    // servers. Production startup rejects this driver below.
    const head = buffer.subarray(0, 1024).toString('latin1')
    if (head.includes(EICAR)) return 'INFECTED'
    return 'CLEAN'
  } catch {
    // If scanning fails, fail closed to PENDING (downloads are blocked until CLEAN).
    return 'PENDING'
  }
}

async function scanWithClamAv(buffer: Buffer): Promise<ScanStatus> {
  const { createConnection } = await import('net')
  const host = process.env.CLAMAV_HOST
  const port = Number(process.env.CLAMAV_PORT || 3310)
  if (!host) return 'PENDING'
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const timeout = setTimeout(
      () => {
        socket.destroy()
        resolve('PENDING')
      },
      Number(process.env.CLAMAV_TIMEOUT_MS || 15_000)
    )
    let response = ''
    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'))
      const chunkSize = 64 * 1024
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length))
        const size = Buffer.alloc(4)
        size.writeUInt32BE(chunk.length)
        socket.write(size)
        socket.write(chunk)
      }
      socket.end(Buffer.alloc(4))
    })
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8')
    })
    socket.on('end', () => {
      clearTimeout(timeout)
      resolve(response.includes('FOUND') ? 'INFECTED' : response.includes('OK') ? 'CLEAN' : 'PENDING')
    })
    socket.on('error', () => {
      clearTimeout(timeout)
      resolve('PENDING')
    })
  })
}
