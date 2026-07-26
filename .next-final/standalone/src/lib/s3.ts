import { prisma } from './prisma'
import { createHmac, createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { scanBuffer } from './virus-scan'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * File storage adapter. Persists bytes to a local storage root
 * (STORAGE_LOCAL_PATH) with a sha256 checksum, and issues short-lived signed
 * download URLs (HMAC over the asset id + expiry). This is a real, working
 * backend. Production can use a private S3-compatible bucket while local
 * development uses the encrypted filesystem implementation.
 */

function storageRoot(): string {
  return process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), '.storage')
}

function objectStorageEnabled() { return process.env.STORAGE_DRIVER === 's3' }

function objectStorage() {
  const bucket = process.env.S3_BUCKET
  const region = process.env.S3_REGION
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  if (!bucket || !region) throw new Error('S3_BUCKET and S3_REGION are required when STORAGE_DRIVER=s3')
  const client = new S3Client({
    region, endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    // Accept the conventional AWS_* names as well: deployments commonly set
    // those, and only reading S3_* silently fell back to the ambient provider
    // chain (or no credentials at all).
    credentials: accessKeyId ? { accessKeyId, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '' } : undefined,
  })
  return { client, bucket }
}

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET
  // 32 characters everywhere: a 16-character download-signing key was weaker
  // than every other secret this application requires.
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET or JWT_SECRET must be at least 32 characters for signed downloads')
  return secret
}

function encryptionKey(): Buffer {
  const secret = process.env.STORAGE_ENCRYPTION_KEY || process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('STORAGE_ENCRYPTION_KEY or a 32-character SESSION_SECRET must be configured')
  return createHash('sha256').update(secret).digest()
}

const ENCRYPTED_HEADER = Buffer.from('FRADENC1')

function encrypt(contents: Buffer): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(contents), cipher.final()])
  return Buffer.concat([ENCRYPTED_HEADER, iv, cipher.getAuthTag(), ciphertext])
}

function decrypt(contents: Buffer): Buffer {
  // Files created by older development versions did not carry the encrypted
  // envelope. Keep them readable so the upgrade is non-destructive.
  if (!contents.subarray(0, ENCRYPTED_HEADER.length).equals(ENCRYPTED_HEADER)) return contents
  const ivStart = ENCRYPTED_HEADER.length
  const tagStart = ivStart + 12
  const dataStart = tagStart + 16
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), contents.subarray(ivStart, tagStart))
  decipher.setAuthTag(contents.subarray(tagStart, dataStart))
  return Buffer.concat([decipher.update(contents.subarray(dataStart)), decipher.final()])
}

/**
 * Resolve a storage key inside the storage root and prove containment.
 * String-stripping `..` is not sufficient (`....//` and encoded variants slip
 * through), so the resolved path is checked against the root prefix instead.
 */
function absPath(storageKey: string): string {
  const root = path.resolve(storageRoot())
  const resolved = path.resolve(root, storageKey.replace(/^[/\\]+/, ''))
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Rejected storage key outside the storage root')
  }
  return resolved
}

export interface S3UploadOptions {
  ownerUserId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  buffer?: Buffer
  sensitivityClass?: string
}

export async function uploadFileAsset(options: S3UploadOptions) {
  const ext = path.extname(options.originalName)
  const storageKey = `assets/${new Date().getFullYear()}/${randomUUID()}${ext}`

  let checksum: string | null = null
  let virusScanStatus: string = 'CLEAN'
  if (options.buffer) {
    virusScanStatus = await scanBuffer(options.buffer)
    if (virusScanStatus !== 'INFECTED') {
      const target = absPath(storageKey)
      const encrypted = encrypt(options.buffer)
      if (objectStorageEnabled()) {
        const { client, bucket } = objectStorage()
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: encrypted, ContentType: 'application/octet-stream', ServerSideEncryption: process.env.S3_KMS_KEY_ID ? 'aws:kms' : 'AES256', SSEKMSKeyId: process.env.S3_KMS_KEY_ID || undefined, Metadata: { sensitivity: options.sensitivityClass || 'STANDARD' } }))
      } else {
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, encrypted)
      }
    }
    checksum = 'sha256:' + createHash('sha256').update(options.buffer).digest('hex')
  }

  const fileAsset = await prisma.fileAsset.create({
    data: {
      ownerUserId: options.ownerUserId,
      storageKey,
      originalName: options.originalName,
      mimeType: options.mimeType,
      sizeBytes: options.sizeBytes,
      checksum,
      virusScanStatus,
      // Only claim encryption-at-rest when bytes were actually persisted.
      encryptionStatus: options.buffer && virusScanStatus !== 'INFECTED' ? 'ENCRYPTED' : 'NOT_STORED',
      sensitivityClass: options.sensitivityClass || 'STANDARD',
    },
  })

  return { fileAsset, storageKey, signedUrl: buildSignedUrl(fileAsset.id) }
}

export async function readFileAsset(
  storageKey: string
): Promise<Buffer | null> {
  try {
    if (objectStorageEnabled()) {
      const { client, bucket } = objectStorage()
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }))
      if (!response.Body) return null
      return decrypt(Buffer.from(await response.Body.transformToByteArray()))
    }
    return decrypt(await fs.readFile(absPath(storageKey)))
  } catch {
    return null
  }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  if (objectStorageEnabled()) { const { client, bucket } = objectStorage(); await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })); return }
  try { await fs.unlink(absPath(storageKey)) } catch (error: any) { if (error?.code !== 'ENOENT') throw error }
}

function sign(assetId: string, expires: number): string {
  return createHmac('sha256', signingSecret())
    .update(`${assetId}.${expires}`)
    .digest('hex')
}

export function buildSignedUrl(fileAssetId: string, expiryMinutes = 60): string {
  const expires = Date.now() + expiryMinutes * 60 * 1000
  const sig = sign(fileAssetId, expires)
  const appUrl = process.env.APP_URL
  if (!appUrl) throw new Error('APP_URL is required to create signed download URLs')
  const url = new URL(`/api/assets/download/${encodeURIComponent(fileAssetId)}`, appUrl)
  url.searchParams.set('expires', String(expires))
  url.searchParams.set('sig', sig)
  return url.toString()
}

export function verifySignature(fileAssetId: string, expires: number, sig: string): boolean {
  if (!expires || !sig) return false
  if (Date.now() > expires) return false
  const expected = sign(fileAssetId, expires)
  // constant-time-ish compare
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

export async function getSignedDownloadUrl(fileAssetId: string, expiryMinutes = 60) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: fileAssetId } })
  if (!asset) return null
  return {
    url: buildSignedUrl(fileAssetId, expiryMinutes),
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
  }
}
