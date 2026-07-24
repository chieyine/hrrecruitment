import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody, adminCreateSchema, adminUpdateSchema, adminDeleteSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

/**
 * Generic admin CRUD over a whitelist of configuration entities.
 * Reads require staff; writes require SYSTEM_ADMIN. Only whitelisted fields are
 * ever persisted, so the endpoint cannot be used to set arbitrary columns.
 */

type FieldType = 'string' | 'int' | 'float' | 'bool' | 'date'
interface EntityConfig {
  model: string
  // field name -> type; these are the only writable fields
  fields: Record<string, FieldType>
  orderBy?: Record<string, 'asc' | 'desc'>
  include?: Record<string, any>
  versioned?: boolean
}

const ENTITIES: Record<string, EntityConfig> = {
  departments: { model: 'department', fields: { name: 'string', code: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  projects: { model: 'project', fields: { name: 'string', code: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  'duty-stations': { model: 'dutyStation', fields: { name: 'string', state: 'string', lga: 'string', address: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  courses: { model: 'course', fields: { title: 'string', description: 'string', category: 'string', learningObjectives: 'string', estimatedDurationMinutes: 'int', passMark: 'float', allowedAttempts: 'int', certificateEnabled: 'bool', active: 'bool' }, orderBy: { title: 'asc' }, versioned: true },
  policies: { model: 'policyDocument', fields: { title: 'string', category: 'string', effectiveDate: 'date', summary: 'string', acknowledgementMethod: 'string', signatureMethod: 'string', active: 'bool' }, orderBy: { title: 'asc' }, versioned: true },
  forms: { model: 'preboardingFormTemplate', fields: { title: 'string', description: 'string', schemaJson: 'string', required: 'bool', reviewRequired: 'bool', active: 'bool' }, orderBy: { title: 'asc' }, versioned: true },
  tasks: { model: 'preboardingTaskTemplate', fields: { title: 'string', description: 'string', category: 'string', required: 'bool', reviewRequired: 'bool', evidenceRequired: 'bool', active: 'bool' }, orderBy: { title: 'asc' }, versioned: true },
  'document-requirements': { model: 'documentRequirement', fields: { name: 'string', description: 'string', documentType: 'string', required: 'bool', allowedFileTypes: 'string', maximumFileSize: 'int', expiryRequired: 'bool', reviewRequired: 'bool', sensitivityClass: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  'preboarding-packages': { model: 'preboardingPackage', fields: { name: 'string', description: 'string', candidateType: 'string', roleCategory: 'string', active: 'bool' }, orderBy: { name: 'asc' }, versioned: true },
  scorecards: { model: 'scorecardTemplate', fields: { name: 'string', scorecardType: 'string', description: 'string', active: 'bool' }, orderBy: { name: 'asc' }, include: { criteria: true }, versioned: true },
  'notification-templates': { model: 'notificationTemplate', fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' }, orderBy: { code: 'asc' }, versioned: true },
  templates: { model: 'offerTemplate', fields: { name: 'string', candidateType: 'string', bodyTemplate: 'string', active: 'bool' }, orderBy: { name: 'asc' }, versioned: true },
  'email-templates': { model: 'notificationTemplate', fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' }, orderBy: { code: 'asc' }, versioned: true },
  'system-settings': { model: 'systemSetting', fields: { key: 'string', valueJson: 'string', description: 'string' }, orderBy: { key: 'asc' } },
  'contract-types': { model: 'contractType', fields: { code: 'string', name: 'string', description: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  'vacancy-categories': { model: 'vacancyCategory', fields: { code: 'string', name: 'string', active: 'bool' }, orderBy: { name: 'asc' } },
  'document-types': { model: 'documentType', fields: { code: 'string', name: 'string', allowedFileTypes: 'string', maximumFileSize: 'int', active: 'bool' }, orderBy: { name: 'asc' } },
  roles: { model: 'role', fields: { name: 'string', description: 'string' }, orderBy: { name: 'asc' }, include: { rolePermissions: { include: { permission: true } } } },
  permissions: { model: 'permission', fields: { code: 'string', description: 'string' }, orderBy: { code: 'asc' } },
}

function coerce(fields: Record<string, FieldType>, data: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const [key, type] of Object.entries(fields)) {
    if (!(key in data) || data[key] === undefined) continue
    const v = data[key]
    if (v === null || v === '') {
      out[key] = null
      continue
    }
    switch (type) {
      case 'int': out[key] = parseInt(String(v), 10); if (!Number.isFinite(out[key])) throw new AuthzError(`${key} must be a number`, 400); break
      case 'float': out[key] = parseFloat(String(v)); if (!Number.isFinite(out[key])) throw new AuthzError(`${key} must be a number`, 400); break
      case 'bool': out[key] = v === true || v === 'true' || v === 'on'; break
      case 'date': out[key] = new Date(v); if (Number.isNaN(out[key].getTime())) throw new AuthzError(`${key} must be a valid date`, 400); break
      default: out[key] = typeof v === 'string' ? v.trim() : String(v)
    }
  }
  return out
}

function model(entity: string): any {
  const cfg = ENTITIES[entity]
  return (prisma as any)[cfg.model]
}

async function authorizeEntity(entity: string) {
  return entity === 'courses'
    ? requirePermission('course.manage')
    : requireRole('SYSTEM_ADMIN')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') || ''

    if (!entity) {
      await requireRole('SYSTEM_ADMIN')
      return NextResponse.json({ entities: Object.keys(ENTITIES) })
    }
    await authorizeEntity(entity)
    if (entity === 'users') {
      const users = await prisma.user.findMany({ select: { id: true, email: true, phone: true, accountStatus: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true, userRoles: { include: { role: true } } }, orderBy: { email: 'asc' } })
      return NextResponse.json({ items: users })
    }

    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
    const id = searchParams.get('id')
    if (searchParams.get('history') === '1') {
      if (!id || !cfg.versioned) throw new AuthzError('Version history is not available for this record', 400)
      const [current, versions] = await Promise.all([
        model(entity).findUnique({ where: { id } }),
        prisma.entityVersion.findMany({ where: { entityType: cfg.model, entityId: id }, orderBy: { version: 'desc' } }),
      ])
      if (!current) throw new AuthzError('Configuration record not found', 404)
      return NextResponse.json({ current, versions })
    }
    if (searchParams.get('impact') === '1') {
      if (!id) throw new AuthzError('Record id is required', 400)
      const counts: Record<string, number> = {}
      if (entity === 'courses') {
        counts['Candidate assignments'] = await prisma.candidateCourse.count({ where: { courseId: id } })
        counts['Preboarding packages'] = await prisma.packageCourse.count({ where: { courseId: id } })
      } else if (entity === 'policies') {
        counts['Candidate acknowledgements'] = await prisma.candidatePolicyAcknowledgement.count({ where: { policyDocumentId: id } })
        counts['Preboarding packages'] = await prisma.packagePolicy.count({ where: { policyDocumentId: id } })
      } else if (entity === 'forms') {
        counts['Candidate forms'] = await prisma.candidatePreboardingForm.count({ where: { formTemplateId: id } })
        counts['Preboarding packages'] = await prisma.packageForm.count({ where: { formTemplateId: id } })
      } else if (entity === 'preboarding-packages') {
        counts['Candidate assignments'] = await prisma.candidatePreboardingPackage.count({ where: { preboardingPackageId: id } })
      } else if (entity === 'scorecards') {
        counts['Submitted or draft scorecards'] = await prisma.candidateScorecard.count({ where: { scorecardTemplateId: id } })
        counts['Configured vacancies'] = await prisma.vacancy.count({ where: { OR: [{ screeningScorecardTemplateId: id }, { interviewScorecardTemplateId: id }] } })
      } else if (entity === 'templates') {
        counts['Offers'] = await prisma.offer.count({ where: { offerTemplateId: id } })
      }
      return NextResponse.json({ counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) })
    }

    const items = await model(entity).findMany({
      ...('active' in cfg.fields ? { where: { active: true } } : {}),
      orderBy: cfg.orderBy,
      ...(cfg.include ? { include: cfg.include } : {}),
    })
    return NextResponse.json({ items })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const { entity, data } = await parseBody(request, adminCreateSchema)
    const user = await authorizeEntity(entity)
    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })

    const created = await model(entity).create({ data: coerce(cfg.fields, data) })
    await logAudit({ actorUserId: user.userId, action: 'ADMIN_CREATE', resourceType: cfg.model, resourceId: created.id, newValue: created })
    return NextResponse.json({ success: true, item: created })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function PUT(request: Request) {
  try {
    const { entity, id, data } = await parseBody(request, adminUpdateSchema)
    const user = await authorizeEntity(entity)
    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })

    const previous = await model(entity).findUnique({ where: { id } })
    if (!previous) throw new AuthzError('Configuration record not found', 404)
    const writable = coerce(cfg.fields, data)
    const updated = cfg.versioned ? await prisma.$transaction(async (tx) => {
      await tx.entityVersion.upsert({ where: { entityType_entityId_version: { entityType: cfg.model, entityId: id, version: previous.version } }, update: {}, create: { entityType: cfg.model, entityId: id, version: previous.version, snapshotJson: JSON.stringify(previous), changeReason: 'Administrative update', createdBy: user.userId } })
      return (tx as any)[cfg.model].update({ where: { id }, data: { ...writable, version: { increment: 1 } } })
    }) : await model(entity).update({ where: { id }, data: writable })
    await logAudit({ actorUserId: user.userId, action: 'ADMIN_UPDATE', resourceType: cfg.model, resourceId: id, previousValue: previous, newValue: updated })
    return NextResponse.json({ success: true, item: updated })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const { entity, id } = await parseBody(request, adminDeleteSchema)
    const user = await authorizeEntity(entity)
    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })

    // Soft-delete when the model supports `active`, else hard delete.
    let result
    if ('active' in cfg.fields) {
      result = await model(entity).update({ where: { id }, data: { active: false } })
    } else {
      result = await model(entity).delete({ where: { id } })
    }
    await logAudit({ actorUserId: user.userId, action: 'ADMIN_DELETE', resourceType: cfg.model, resourceId: id })
    return NextResponse.json({ success: true, item: result })
  } catch (err) {
    return authzResponse(err)
  }
}
