import { describe, it, expect } from 'vitest'
import { scanBuffer } from '@/lib/virus-scan'

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'

describe('virus scan', () => {
  it('flags the EICAR test signature', async () => {
    expect(await scanBuffer(Buffer.from(EICAR + '-STANDARD-ANTIVIRUS-TEST-FILE!'))).toBe('INFECTED')
  })
  it('passes ordinary content', async () => {
    expect(await scanBuffer(Buffer.from('a normal CV in plain text'))).toBe('CLEAN')
  })
})
