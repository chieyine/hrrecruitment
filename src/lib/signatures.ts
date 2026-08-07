import { prisma } from './prisma'
import { logAudit } from './audit'
import { logger } from './logger'
import {
  hashSignaturePayload,
  isCriticalSignature,
  SignatureRequiredError,
  type SignableResourceType,
  type SignatureMethod,
} from './signature-policy'

// Policy and hashing live in `signature-policy.ts` so they stay unit-testable
// without a database. Re-exported here so callers have one import site.
export {
  SIGNABLE_RESOURCE_TYPES,
  SIGNATURE_METHODS,
  CRITICAL_SIGNATURE_TYPES,
  isCriticalSignature,
  hashSignaturePayload,
  SignatureRequiredError,
  type SignableResourceType,
  type SignatureMethod,
} from './signature-policy'

/**
 * Electronic approvals and signatures (End_to_End.md §28.10).
 *
 * Every document class in §28.10 signs through this one helper so the recorded
 * evidence is uniform: who signed, when, over which version, by what method,
 * how they were authenticated, and whether anything amended it later.
 *
 * The signature is taken over a hash of the exact payload that was approved. If
 * the underlying record is edited afterwards the hash no longer matches, which
 * is what makes a "silent change" detectable rather than merely discouraged.
 */

/** Client hints are best-effort evidence, never an access control input. */
function requestContext(request?: Request) {
  if (!request) return { ipAddress: null, userAgent: null }
  const forwarded = request.headers.get('x-forwarded-for')
  return {
    ipAddress: forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent')?.slice(0, 500) || null,
  }
}

export interface RecordSignatureInput {
  resourceType: SignableResourceType
  resourceId: string
  signatoryUserId?: string | null
  signatoryName: string
  signatoryEmail?: string | null
  signatoryRole?: string | null
  signatureMethod: SignatureMethod
  /** Version of the record being signed, so an amendment is visible as a new version. */
  documentVersion?: number
  /** The exact content approved. Hashed, never stored verbatim here. */
  payload: unknown
  authenticationMethod?: 'SESSION' | 'MFA' | 'EMAIL_TOKEN' | 'SSO'
  drawnSignatureData?: string | null
  signedFileId?: string | null
  request?: Request
}

/** The minimum client surface a transaction handle must expose. */
type SignatureWriter = {
  electronicSignature: { create: (args: any) => Promise<{ id: string; documentHash: string; signedAt: Date }> }
}

function signatureRow(input: RecordSignatureInput, ipAddress: string | null, userAgent: string | null) {
  return {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    signatoryUserId: input.signatoryUserId ?? null,
    signatoryName: input.signatoryName,
    signatoryEmail: input.signatoryEmail ?? null,
    signatoryRole: input.signatoryRole ?? null,
    documentVersion: input.documentVersion ?? 1,
    documentHash: hashSignaturePayload(input.payload),
    signatureMethod: input.signatureMethod,
    authenticationMethod: input.authenticationMethod ?? 'SESSION',
    drawnSignatureData: input.drawnSignatureData ?? null,
    signedFileId: input.signedFileId ?? null,
    ipAddress,
    userAgent,
  }
}

/**
 * Write a signature inside an existing transaction, alongside the state change
 * it attests.
 *
 * This is the form every critical decision should use: if the signature write
 * fails the surrounding transaction aborts, so it is impossible to end up with
 * an approved record that carries no signature. Pass the `tx` client from
 * `prisma.$transaction`.
 *
 * The audit entry is deliberately *not* written here — `logAudit` opens its own
 * transaction, and nesting one inside another deadlocks. Call
 * `logSignatureCaptured` after the transaction commits.
 */
export async function recordSignatureIn(tx: SignatureWriter, input: RecordSignatureInput) {
  const { ipAddress, userAgent } = requestContext(input.request)
  return tx.electronicSignature.create({
    data: signatureRow(input, ipAddress, userAgent),
    select: { id: true, documentHash: true, signedAt: true },
  })
}

/** Audit companion for `recordSignatureIn`, called once the transaction commits. */
export async function logSignatureCaptured(
  input: RecordSignatureInput,
  signature: { id: string; documentHash: string }
) {
  const { ipAddress, userAgent } = requestContext(input.request)
  await logAudit({
    actorUserId: input.signatoryUserId ?? null,
    action: 'SIGNATURE_RECORDED',
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    newValue: {
      signatureId: signature.id,
      method: input.signatureMethod,
      documentHash: signature.documentHash,
      documentVersion: input.documentVersion ?? 1,
    },
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
  })
}

/**
 * Standalone signature write, for callers that are not already inside a
 * transaction.
 *
 * A failure on a critical signature type throws, because a decision nobody can
 * be held to is worse than a decision that did not complete. Non-critical types
 * degrade to an operational event so an advisory acknowledgement cannot take
 * down the action it accompanies.
 */
export async function recordSignature(input: RecordSignatureInput) {
  const { ipAddress, userAgent } = requestContext(input.request)
  try {
    const signature = await prisma.electronicSignature.create({
      data: signatureRow(input, ipAddress, userAgent),
      select: { id: true, documentHash: true, signedAt: true },
    })
    await logSignatureCaptured(input, signature)
    return signature
  } catch (error) {
    logger.error('Failed to record electronic signature', {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      critical: isCriticalSignature(input.resourceType),
      error: error instanceof Error ? error.message : String(error),
    })
    await prisma.operationalEvent
      .create({
        data: {
          eventType: 'SIGNATURE_WRITE_FAILED',
          severity: isCriticalSignature(input.resourceType) ? 'CRITICAL' : 'HIGH',
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          detailsJson: JSON.stringify({ method: input.signatureMethod }),
        },
      })
      .catch(() => undefined)

    if (isCriticalSignature(input.resourceType)) throw new SignatureRequiredError(input.resourceType)
    return null
  }
}

/**
 * Mark an existing signature as amended (§28.10 "any subsequent amendment").
 * The original row is never deleted; it is superseded and linked forward.
 */
export async function amendSignature(signatureId: string, replacementId: string, reason: string) {
  return prisma.electronicSignature.update({
    where: { id: signatureId },
    data: { status: 'AMENDED', amendedBySignatureId: replacementId, amendmentReason: reason },
  })
}

/**
 * Re-verify that what was signed still matches the record today. A mismatch does
 * not mean fraud, but it does mean the signed version is no longer the current
 * version and the difference has to be explained.
 */
export async function verifySignature(signatureId: string, currentPayload: unknown) {
  const signature = await prisma.electronicSignature.findUnique({ where: { id: signatureId } })
  if (!signature) return { found: false as const }
  const currentHash = hashSignaturePayload(currentPayload)
  return {
    found: true as const,
    matches: signature.documentHash === currentHash,
    signedHash: signature.documentHash,
    currentHash,
    signedAt: signature.signedAt,
    status: signature.status,
  }
}

export async function signaturesFor(resourceType: SignableResourceType, resourceId: string) {
  return prisma.electronicSignature.findMany({
    where: { resourceType, resourceId },
    orderBy: { signedAt: 'desc' },
    select: {
      id: true,
      signatoryName: true,
      signatoryEmail: true,
      signatoryRole: true,
      signatureMethod: true,
      authenticationMethod: true,
      documentVersion: true,
      documentHash: true,
      status: true,
      signedAt: true,
      amendmentReason: true,
    },
  })
}
