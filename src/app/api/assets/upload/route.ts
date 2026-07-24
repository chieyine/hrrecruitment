import { NextResponse } from 'next/server'
import { requireUser, authzResponse } from '@/lib/authz'
import { uploadFileAsset } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { rateLimitDistributed } from '@/lib/rate-limit'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function signatureMatches(buffer: Buffer, mime: string) {
  if (mime === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-'
  if (['image/jpeg', 'image/jpg'].includes(mime)) return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mime === 'application/msword') return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return buffer[0] === 0x50 && buffer[1] === 0x4b
  return false
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const limit = await rateLimitDistributed(`asset-upload:${user.userId}`, 20, 3_600_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Upload limit reached. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 10MB limit' }, { status: 400 })
    }
    if (file.type && !ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!signatureMatches(buffer, file.type)) {
      return NextResponse.json({ error: 'File contents do not match the declared type' }, { status: 400 })
    }
    const sensitivityClass = String(form.get('sensitivityClass') || 'STANDARD')
    if (!['STANDARD', 'CONFIDENTIAL', 'RESTRICTED'].includes(sensitivityClass)) return NextResponse.json({ error: 'Invalid sensitivity classification' }, { status: 400 })
    const since = new Date(Date.now() - 24 * 3_600_000)
    const usage = await prisma.fileAsset.aggregate({ where: { ownerUserId: user.userId, createdAt: { gte: since } }, _sum: { sizeBytes: true } })
    if ((usage._sum.sizeBytes || 0) + file.size > 100 * 1024 * 1024) return NextResponse.json({ error: 'Daily upload quota exceeded' }, { status: 429 })

    const { fileAsset, signedUrl } = await uploadFileAsset({
      ownerUserId: user.userId,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      buffer,
      sensitivityClass,
    })

    // Reject files the scanner flagged as infected.
    if (fileAsset.virusScanStatus === 'INFECTED') {
      await prisma.fileAsset.delete({ where: { id: fileAsset.id } }).catch(() => {})
      return NextResponse.json({ error: 'File failed the security scan and was rejected.' }, { status: 400 })
    }

    await logAudit({
      actorUserId: user.userId,
      action: 'FILE_UPLOADED',
      resourceType: 'FileAsset',
      resourceId: fileAsset.id,
      newValue: { originalName: fileAsset.originalName, sizeBytes: fileAsset.sizeBytes },
    })

    return NextResponse.json({
      success: true,
      fileAssetId: fileAsset.id,
      originalName: fileAsset.originalName,
      signedUrl,
    })
  } catch (err) {
    return authzResponse(err)
  }
}
