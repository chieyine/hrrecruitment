import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

/**
 * AES-256-GCM envelope for short secrets held in the database (currently TOTP
 * seeds). The same construction lib/s3 and lib/outbox use, factored out so all
 * three share one implementation rather than three near-copies.
 */

const HEADER = 'enc:v1:'

function key(): Buffer {
  const secret = process.env.STORAGE_ENCRYPTION_KEY || process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('STORAGE_ENCRYPTION_KEY (or a 32-character SESSION_SECRET) is required to protect stored secrets')
  }
  return createHash('sha256').update(secret).digest()
}

export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${HEADER}${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`
}

export function openSecret(sealed: string): string {
  if (!sealed.startsWith(HEADER)) {
    throw new Error('Stored secret is not in the expected encrypted envelope')
  }
  const [, , iv, tag, ciphertext] = sealed.split(':')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}
