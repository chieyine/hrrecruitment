import { prisma } from '@/lib/prisma'
import { AuthzError } from '@/lib/authz'

type FieldType = 'string' | 'int' | 'float' | 'bool' | 'date'
type ReleaseConfig = { model: string; fields: Record<string, FieldType> }

export const RELEASE_ENTITIES: Record<string, ReleaseConfig> = {
  courses: { model: 'course', fields: { title: 'string', description: 'string', category: 'string', learningObjectives: 'string', estimatedDurationMinutes: 'int', passMark: 'float', allowedAttempts: 'int', certificateEnabled: 'bool', active: 'bool' } },
  policies: { model: 'policyDocument', fields: { title: 'string', category: 'string', effectiveDate: 'date', summary: 'string', acknowledgementMethod: 'string', signatureMethod: 'string', active: 'bool' } },
  forms: { model: 'preboardingFormTemplate', fields: { title: 'string', description: 'string', schemaJson: 'string', required: 'bool', reviewRequired: 'bool', active: 'bool' } },
  tasks: { model: 'preboardingTaskTemplate', fields: { title: 'string', description: 'string', category: 'string', required: 'bool', reviewRequired: 'bool', evidenceRequired: 'bool', active: 'bool' } },
  'preboarding-packages': { model: 'preboardingPackage', fields: { name: 'string', description: 'string', candidateType: 'string', roleCategory: 'string', active: 'bool' } },
  scorecards: { model: 'scorecardTemplate', fields: { name: 'string', scorecardType: 'string', description: 'string', active: 'bool' } },
  'notification-templates': { model: 'notificationTemplate', fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' } },
  templates: { model: 'offerTemplate', fields: { name: 'string', candidateType: 'string', bodyTemplate: 'string', active: 'bool' } },
  'email-templates': { model: 'notificationTemplate', fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' } },
}

export function coerceRelease(entity: string, data: Record<string, unknown>) {
  const config = RELEASE_ENTITIES[entity]
  if (!config) throw new AuthzError('This configuration does not support controlled releases', 400)
  const output: Record<string, unknown> = {}
  for (const [key, type] of Object.entries(config.fields)) {
    if (!(key in data)) continue
    const value = data[key]
    if (value === '' || value === null || value === undefined) { output[key] = null; continue }
    if (type === 'int') output[key] = Number.parseInt(String(value), 10)
    else if (type === 'float') output[key] = Number.parseFloat(String(value))
    else if (type === 'bool') output[key] = value === true || value === 'true' || value === 'on'
    else if (type === 'date') output[key] = new Date(String(value))
    else output[key] = String(value).trim()
  }
  return output
}

export async function applyConfigurationRelease(releaseId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const release = await tx.configurationChangeRequest.findUnique({ where: { id: releaseId } })
    if (!release) throw new AuthzError('Configuration release not found', 404)
    if (release.status !== 'APPROVED') throw new AuthzError('Only an approved release can be published', 409)
    const entity = release.changeType.replace('GENERIC_CONFIG_UPDATE:', '')
    const config = RELEASE_ENTITIES[entity]
    if (!config) throw new AuthzError('Unsupported configuration release', 400)
    const current = await (tx as any)[config.model].findUnique({ where: { id: release.resourceId } })
    if (!current) throw new AuthzError('Configuration record no longer exists', 404)
    const base = release.previousJson ? JSON.parse(release.previousJson) : null
    if (base?.version !== undefined && current.version !== base.version) throw new AuthzError('The live configuration changed after this draft was created. Create a fresh draft from the current version.', 409)
    const proposal = JSON.parse(release.proposedJson)
    await tx.entityVersion.upsert({ where: { entityType_entityId_version: { entityType: config.model, entityId: release.resourceId, version: current.version } }, update: {}, create: { entityType: config.model, entityId: release.resourceId, version: current.version, snapshotJson: JSON.stringify(current), changeReason: release.reason, createdBy: actorUserId } })
    const updated = await (tx as any)[config.model].update({ where: { id: release.resourceId }, data: { ...coerceRelease(entity, proposal), version: { increment: 1 } } })
    await tx.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'APPLIED', appliedAt: new Date(), previousJson: release.previousJson || JSON.stringify(current), lockVersion: { increment: 1 } } })
    return updated
  })
}

export async function expireConfigurationRelease(releaseId: string, actorUserId = 'SYSTEM') {
  return prisma.$transaction(async (tx) => {
    const release = await tx.configurationChangeRequest.findUnique({ where: { id: releaseId } })
    if (!release || release.status !== 'APPLIED' || !release.previousJson) return null
    if (!release.effectiveTo || release.effectiveTo > new Date()) return null
    const entity = release.changeType.replace('GENERIC_CONFIG_UPDATE:', '')
    const config = RELEASE_ENTITIES[entity]
    if (!config) return null
    const current = await (tx as any)[config.model].findUnique({ where: { id: release.resourceId } })
    if (!current) return null
    await tx.entityVersion.upsert({ where: { entityType_entityId_version: { entityType: config.model, entityId: release.resourceId, version: current.version } }, update: {}, create: { entityType: config.model, entityId: release.resourceId, version: current.version, snapshotJson: JSON.stringify(current), changeReason: `Effective period ended for release ${release.id}`, createdBy: actorUserId } })
    const restored = coerceRelease(entity, JSON.parse(release.previousJson))
    const updated = await (tx as any)[config.model].update({ where: { id: release.resourceId }, data: { ...restored, version: { increment: 1 } } })
    await tx.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'EXPIRED', decisionComment: 'Effective period ended; previous configuration restored.', lockVersion: { increment: 1 } } })
    return updated
  })
}
