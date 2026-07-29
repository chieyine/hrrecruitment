import { randomBytes } from 'crypto'

export function createApplicationReference() {
  return `FRAD-APP-${new Date().getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`
}
