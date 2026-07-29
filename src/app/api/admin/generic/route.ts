import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, requireStaff, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody, adminCreateSchema, adminUpdateSchema, adminDeleteSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { validateFormSchema } from '@/lib/form-template'
import { validateMessageTemplate } from '@/lib/message-template'
import { validatePolicyValues } from '@/lib/policy-template'
import { validateOfferTemplate } from '@/lib/offer-template'
import { STAFF_ROLE_NAMES } from '@/lib/roles'

/**
 * Generic admin CRUD over a whitelist of configuration entities.
 * Security and platform configuration requires SYSTEM_ADMIN. Recruitment
 * configuration belongs to HR_MANAGER, while `courses` is delegated to the
 * `course.manage` permission. Only whitelisted fields are ever persisted, so
 * the endpoint cannot be used to set arbitrary columns.
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
  departments: {
    model: 'department',
    fields: { name: 'string', code: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { vacancies: true } } },
  },
  projects: {
    model: 'project',
    fields: { name: 'string', code: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { vacancies: true } } },
  },
  'duty-stations': {
    model: 'dutyStation',
    fields: { name: 'string', state: 'string', lga: 'string', address: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { vacancies: true } } },
  },
  courses: {
    model: 'course',
    fields: {
      title: 'string',
      description: 'string',
      category: 'string',
      learningObjectives: 'string',
      estimatedDurationMinutes: 'int',
      passMark: 'float',
      allowedAttempts: 'int',
      certificateEnabled: 'bool',
      active: 'bool',
    },
    orderBy: { title: 'asc' },
    versioned: true,
  },
  policies: {
    model: 'policyDocument',
    fields: {
      title: 'string',
      category: 'string',
      effectiveDate: 'date',
      summary: 'string',
      fileAssetId: 'string',
      acknowledgementMethod: 'string',
      active: 'bool',
    },
    orderBy: { title: 'asc' },
    include: { _count: { select: { packagePolicies: true, candidatePolicies: true } } },
    versioned: true,
  },
  forms: {
    model: 'preboardingFormTemplate',
    fields: {
      title: 'string',
      description: 'string',
      schemaJson: 'string',
      required: 'bool',
      reviewRequired: 'bool',
      sensitivityClass: 'string',
      active: 'bool',
    },
    orderBy: { title: 'asc' },
    include: { _count: { select: { packageForms: true, candidateForms: true } } },
    versioned: true,
  },
  tasks: {
    model: 'preboardingTaskTemplate',
    fields: {
      title: 'string',
      description: 'string',
      category: 'string',
      required: 'bool',
      reviewRequired: 'bool',
      evidenceRequired: 'bool',
      active: 'bool',
    },
    orderBy: { title: 'asc' },
    include: { _count: { select: { packageTasks: true, candidateTasks: true } } },
    versioned: true,
  },
  'document-requirements': {
    model: 'documentRequirement',
    fields: {
      name: 'string',
      description: 'string',
      documentType: 'string',
      required: 'bool',
      allowedFileTypes: 'string',
      maximumFileSize: 'int',
      expiryRequired: 'bool',
      reviewRequired: 'bool',
      sensitivityClass: 'string',
      active: 'bool',
    },
    orderBy: { name: 'asc' },
    include: { _count: { select: { packageDocuments: true, candidateDocs: true } } },
  },
  'preboarding-packages': {
    model: 'preboardingPackage',
    fields: { name: 'string', description: 'string', candidateType: 'string', roleCategory: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    versioned: true,
  },
  scorecards: {
    model: 'scorecardTemplate',
    fields: { name: 'string', scorecardType: 'string', description: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { criteria: { orderBy: { displayOrder: 'asc' } }, _count: { select: { scorecards: true } } },
    versioned: true,
  },
  'notification-templates': {
    model: 'notificationTemplate',
    fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' },
    orderBy: { code: 'asc' },
    versioned: true,
  },
  templates: {
    model: 'offerTemplate',
    fields: { name: 'string', candidateType: 'string', bodyTemplate: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { offers: true } } },
    versioned: true,
  },
  'email-templates': {
    model: 'notificationTemplate',
    fields: { code: 'string', subject: 'string', bodyTemplate: 'string', active: 'bool' },
    orderBy: { code: 'asc' },
    versioned: true,
  },
  'system-settings': {
    model: 'systemSetting',
    fields: { key: 'string', valueJson: 'string', description: 'string' },
    orderBy: { key: 'asc' },
  },
  'contract-types': {
    model: 'contractType',
    fields: { code: 'string', name: 'string', description: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
  },
  'vacancy-categories': {
    model: 'vacancyCategory',
    fields: { code: 'string', name: 'string', active: 'bool' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { vacancies: true } } },
  },
  'document-types': {
    model: 'documentType',
    fields: { code: 'string', name: 'string', allowedFileTypes: 'string', maximumFileSize: 'int', active: 'bool' },
    orderBy: { name: 'asc' },
  },
  roles: {
    model: 'role',
    fields: { name: 'string', description: 'string' },
    orderBy: { name: 'asc' },
    include: { rolePermissions: { include: { permission: true } } },
  },
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
      case 'int':
        out[key] = parseInt(String(v), 10)
        if (!Number.isFinite(out[key])) throw new AuthzError(`${key} must be a number`, 400)
        break
      case 'float':
        out[key] = parseFloat(String(v))
        if (!Number.isFinite(out[key])) throw new AuthzError(`${key} must be a number`, 400)
        break
      case 'bool':
        out[key] = v === true || v === 'true' || v === 'on'
        break
      case 'date':
        out[key] = new Date(v)
        if (Number.isNaN(out[key].getTime())) throw new AuthzError(`${key} must be a valid date`, 400)
        break
      default:
        out[key] = typeof v === 'string' ? v.trim() : String(v)
    }
  }
  return out
}

function validateEntityValues(entity: string, values: Record<string, any>) {
  if (entity === 'departments') {
    if (values.name !== undefined && values.name.length < 2)
      throw new AuthzError('Enter a department name', 422)
    if (values.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(values.code))
      throw new AuthzError('Use 2–30 uppercase letters, numbers, hyphens or underscores for the reporting code', 422)
  }
  if (entity === 'document-requirements') {
    if (values.name !== undefined && values.name.length < 3)
      throw new AuthzError('Enter a clear requirement name', 422)
    if (values.description !== undefined && values.description.length < 10)
      throw new AuthzError('Give the candidate clear instructions (at least 10 characters)', 422)
    if (values.allowedFileTypes !== undefined) {
      const extensions = values.allowedFileTypes
        .toLowerCase()
        .split(',')
        .map((value: string) => value.trim().replace(/^\./, ''))
        .filter(Boolean)
      const supported = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])
      if (!extensions.length || extensions.some((extension: string) => !supported.has(extension)))
        throw new AuthzError('Accepted file types may only include PDF, JPG, JPEG, PNG, DOC or DOCX', 422)
      values.allowedFileTypes = [...new Set(extensions)].join(',')
    }
    if (
      values.maximumFileSize !== undefined &&
      (!Number.isInteger(values.maximumFileSize) || values.maximumFileSize < 1_048_576 || values.maximumFileSize > 10_485_760)
    )
      throw new AuthzError('Maximum file size must be between 1 MB and 10 MB', 422)
    if (
      values.sensitivityClass !== undefined &&
      !['STANDARD', 'CONFIDENTIAL', 'RESTRICTED'].includes(values.sensitivityClass)
    )
      throw new AuthzError('Choose a valid access classification', 422)
  }
  if (entity === 'document-types') {
    if (values.name !== undefined && values.name.length < 2)
      throw new AuthzError('Enter a candidate-facing document name', 422)
    if (values.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(values.code))
      throw new AuthzError('Use 2–40 uppercase letters, numbers, hyphens or underscores for the stable code', 422)
    if (values.allowedFileTypes !== undefined) {
      const extensions = values.allowedFileTypes
        .toLowerCase()
        .split(',')
        .map((value: string) => value.trim().replace(/^\./, ''))
        .filter(Boolean)
      const supported = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])
      if (!extensions.length || extensions.some((extension: string) => !supported.has(extension)))
        throw new AuthzError('Accepted file types may only include PDF, JPG, JPEG, PNG, DOC or DOCX', 422)
      values.allowedFileTypes = [...new Set(extensions)].join(',')
    }
    if (
      values.maximumFileSize !== undefined &&
      (!Number.isInteger(values.maximumFileSize) || values.maximumFileSize < 1_048_576 || values.maximumFileSize > 10_485_760)
    )
      throw new AuthzError('Maximum file size must be between 1 MB and 10 MB', 422)
  }
  if (entity === 'duty-stations') {
    if (values.name !== undefined && values.name.length < 2)
      throw new AuthzError('Enter a location name', 422)
    if (values.state !== undefined && values.state.length < 2)
      throw new AuthzError('Enter the state', 422)
    if (values.address !== undefined && values.address !== null && values.address.length > 500)
      throw new AuthzError('Address must be 500 characters or fewer', 422)
  }
  if (entity === 'forms') {
    if (values.title !== undefined && values.title.length < 3)
      throw new AuthzError('Enter a clear form title', 422)
    if (values.description !== undefined && values.description.length < 10)
      throw new AuthzError('Give the candidate clear instructions (at least 10 characters)', 422)
    if (
      values.sensitivityClass !== undefined &&
      !['STANDARD', 'CONFIDENTIAL', 'RESTRICTED'].includes(values.sensitivityClass)
    )
      throw new AuthzError('Choose a valid access classification', 422)
    if (values.schemaJson !== undefined) values.schemaJson = validateFormSchema(values.schemaJson)
  }
  if (entity === 'notification-templates' || entity === 'email-templates') {
    validateMessageTemplate(values)
  }
  if (entity === 'templates') validateOfferTemplate(values)
  if (entity === 'policies') validatePolicyValues(values)
  if (entity === 'preboarding-packages') {
    if (values.name !== undefined && (values.name.length < 3 || values.name.length > 160))
      throw new AuthzError('Package name must be between 3 and 160 characters', 422)
    if (values.description !== undefined && (values.description.length < 10 || values.description.length > 1000))
      throw new AuthzError('Explain when this package should be used (10–1,000 characters)', 422)
  }
  if (entity === 'projects') {
    if (values.name !== undefined && (values.name.length < 2 || values.name.length > 200))
      throw new AuthzError('Project name must be between 2 and 200 characters', 422)
    if (values.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(values.code))
      throw new AuthzError('Use 2–40 uppercase letters, numbers, hyphens or underscores for the reporting code', 422)
  }
  if (entity === 'scorecards') {
    if (values.name !== undefined && (values.name.length < 3 || values.name.length > 160))
      throw new AuthzError('Scorecard name must be between 3 and 160 characters', 422)
    if (values.description !== undefined && (values.description.length < 10 || values.description.length > 1000))
      throw new AuthzError('Explain when this scorecard should be used (10–1,000 characters)', 422)
    if (values.scorecardType !== undefined && !['SCREENING', 'INTERVIEW'].includes(values.scorecardType))
      throw new AuthzError('Choose application screening or interview', 422)
  }
  if (entity === 'vacancy-categories') {
    if (values.name !== undefined && (values.name.length < 2 || values.name.length > 160))
      throw new AuthzError('Job family name must be between 2 and 160 characters', 422)
    if (values.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(values.code))
      throw new AuthzError('Use 2–40 uppercase letters, numbers, hyphens or underscores for the reporting code', 422)
  }
  if (entity === 'tasks') {
    if (values.title !== undefined && (values.title.length < 3 || values.title.length > 160))
      throw new AuthzError('Request title must be between 3 and 160 characters', 422)
    if (values.description !== undefined && (values.description.length < 10 || values.description.length > 1000))
      throw new AuthzError('Give the candidate a clear instruction (10–1,000 characters)', 422)
  }
  if (entity !== 'courses') return
  if (values.category && !['CORE', 'HEALTH', 'FINANCE', 'DRIVER', 'MEAL', 'MANAGER'].includes(values.category))
    throw new AuthzError('Choose a valid course category', 422)
  if (
    values.estimatedDurationMinutes !== undefined &&
    (!Number.isInteger(values.estimatedDurationMinutes) ||
      values.estimatedDurationMinutes < 1 ||
      values.estimatedDurationMinutes > 1440)
  )
    throw new AuthzError('Course duration must be between 1 and 1,440 minutes', 422)
  if (values.passMark !== undefined && (!Number.isFinite(values.passMark) || values.passMark < 0 || values.passMark > 100))
    throw new AuthzError('Pass mark must be between 0 and 100', 422)
  if (
    values.allowedAttempts !== undefined &&
    (!Number.isInteger(values.allowedAttempts) || values.allowedAttempts < 1 || values.allowedAttempts > 20)
  )
    throw new AuthzError('Allowed attempts must be between 1 and 20', 422)
}

function model(entity: string): any {
  const cfg = ENTITIES[entity]
  if (!cfg) throw new AuthzError(`Unknown entity: ${entity}`, 400)
  return (prisma as any)[cfg.model]
}

/** Hard ceiling on any configuration list so one request cannot read a whole table. */
const MAX_ITEMS = 500

/**
 * Records that must never be hard-deleted through the generic endpoint.
 * Deleting a Role or Permission row silently rewrites everyone's privileges
 * (and removing SYSTEM_ADMIN locks the platform out of its own administration),
 * while system settings are referenced by name at runtime.
 */
const DELETE_PROTECTED_ENTITIES = new Set(['roles', 'permissions', 'system-settings'])
const IMMUTABLE_ENTITIES = new Set(['roles', 'permissions', 'system-settings'])

/**
 * Entities that are pure reference data: any staff member creating a vacancy or
 * reviewing an application needs to read them. Writes remain with HR_MANAGER.
 * Without this carve-out, ordinary recruitment forms could not load configured
 * departments, locations, contracts or document types.
 */
const STAFF_READABLE_ENTITIES = new Set([
  'contract-types',
  'document-types',
  'vacancy-categories',
  'departments',
  'duty-stations',
  'projects',
])

// These records describe the organisation and the choices available when HR
// opens a vacancy. They are operational recruitment data, not platform or
// access-control settings.
const RECRUITMENT_CONFIG_ENTITIES = new Set([
  'departments',
  'projects',
  'duty-stations',
  'contract-types',
  'vacancy-categories',
  'document-types',
  'document-requirements',
  'scorecards',
  'policies',
  'forms',
  'tasks',
  'preboarding-packages',
  'notification-templates',
  'templates',
  'email-templates',
])

async function authorizeEntity(entity: string, mode: 'read' | 'write' = 'write') {
  if (mode === 'read' && STAFF_READABLE_ENTITIES.has(entity)) return requireStaff()
  if (RECRUITMENT_CONFIG_ENTITIES.has(entity)) return requireRole('HR_MANAGER')
  return entity === 'courses' ? requirePermission('course.manage') : requireRole('SYSTEM_ADMIN')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') || ''

    if (!entity) {
      await requireRole('SYSTEM_ADMIN')
      return NextResponse.json({ entities: ['roles', 'permissions', 'system-settings'] })
    }
    await authorizeEntity(entity, 'read')
    if (entity === 'users') {
      const staffOnly = searchParams.get('staffOnly') === '1'
      const users = await prisma.user.findMany({
        where: staffOnly
          ? { userRoles: { some: { role: { name: { in: [...STAFF_ROLE_NAMES] } } } } }
          : undefined,
        select: {
          id: true,
          email: true,
          phone: true,
          accountStatus: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: { include: { role: true } },
        },
        orderBy: { email: 'asc' },
        take: MAX_ITEMS,
      })
      return NextResponse.json({ items: users, truncated: users.length === MAX_ITEMS })
    }

    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
    const id = searchParams.get('id')
    if (searchParams.get('history') === '1') {
      if (!id || !cfg.versioned) throw new AuthzError('Version history is not available for this record', 400)
      const [current, versions] = await Promise.all([
        model(entity).findUnique({ where: { id } }),
        prisma.entityVersion.findMany({
          where: { entityType: cfg.model, entityId: id },
          orderBy: { version: 'desc' },
          take: MAX_ITEMS,
        }),
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
        counts['Candidate acknowledgements'] = await prisma.candidatePolicyAcknowledgement.count({
          where: { policyDocumentId: id },
        })
        counts['Preboarding packages'] = await prisma.packagePolicy.count({ where: { policyDocumentId: id } })
      } else if (entity === 'forms') {
        counts['Candidate forms'] = await prisma.candidatePreboardingForm.count({ where: { formTemplateId: id } })
        counts['Preboarding packages'] = await prisma.packageForm.count({ where: { formTemplateId: id } })
      } else if (entity === 'preboarding-packages') {
        counts['Candidate assignments'] = await prisma.candidatePreboardingPackage.count({
          where: { preboardingPackageId: id },
        })
        counts['Vacancies'] = await prisma.vacancy.count({ where: { preboardingPackageId: id } })
      } else if (entity === 'scorecards') {
        counts['Submitted or draft scorecards'] = await prisma.candidateScorecard.count({
          where: { scorecardTemplateId: id },
        })
        counts['Configured vacancies'] = await prisma.vacancy.count({
          where: { OR: [{ screeningScorecardTemplateId: id }, { interviewScorecardTemplateId: id }] },
        })
      } else if (entity === 'templates') {
        counts['Offers'] = await prisma.offer.count({ where: { offerTemplateId: id } })
      } else if (entity === 'contract-types') {
        const item = await prisma.contractType.findUnique({ where: { id }, select: { code: true } })
        counts['Vacancies'] = item ? await prisma.vacancy.count({ where: { contractType: item.code } }) : 0
      } else if (entity === 'departments') {
        counts['Vacancies'] = await prisma.vacancy.count({ where: { departmentId: id } })
      } else if (entity === 'vacancy-categories') {
        counts['Vacancies'] = await prisma.vacancy.count({ where: { categoryId: id } })
      } else if (entity === 'projects') {
        counts['Vacancies'] = await prisma.vacancy.count({ where: { projectId: id } })
      } else if (entity === 'document-requirements') {
        counts['Preboarding packages'] = await prisma.packageDocumentRequirement.count({
          where: { documentRequirementId: id },
        })
        counts['Candidate assignments'] = await prisma.candidateRequiredDocument.count({
          where: { documentRequirementId: id },
        })
      } else if (entity === 'document-types') {
        const item = await prisma.documentType.findUnique({ where: { id }, select: { code: true } })
        if (item) {
          const [candidateDocuments, vacancyRequirements, preboardingRequirements] = await Promise.all([
            prisma.candidateDocument.count({ where: { documentType: item.code } }),
            prisma.vacancyRequiredDocument.count({ where: { documentType: item.code } }),
            prisma.documentRequirement.count({ where: { documentType: item.code } }),
          ])
          counts['Candidate documents'] = candidateDocuments
          counts['Vacancy requirements'] = vacancyRequirements
          counts['Preboarding requirements'] = preboardingRequirements
        }
      } else if (entity === 'duty-stations') {
        counts['Vacancies'] = await prisma.vacancy.count({ where: { dutyStationId: id } })
      }
      return NextResponse.json({ counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) })
    }

    let items = await model(entity).findMany({
      orderBy: cfg.orderBy,
      ...(cfg.include ? { include: cfg.include } : {}),
      take: MAX_ITEMS,
    })
    if (entity === 'document-types') {
      const [candidateUse, vacancyUse, preboardingUse] = await Promise.all([
        prisma.candidateDocument.groupBy({ by: ['documentType'], _count: { _all: true } }),
        prisma.vacancyRequiredDocument.groupBy({ by: ['documentType'], _count: { _all: true } }),
        prisma.documentRequirement.groupBy({ by: ['documentType'], _count: { _all: true } }),
      ])
      const countMap = (rows: Array<{ documentType: string; _count: { _all: number } }>) =>
        new Map(rows.map((row) => [row.documentType, row._count._all]))
      const candidates = countMap(candidateUse)
      const vacancies = countMap(vacancyUse)
      const preboarding = countMap(preboardingUse)
      items = items.map((item: any) => ({
        ...item,
        usage: {
          total:
            (candidates.get(item.code) || 0) + (vacancies.get(item.code) || 0) + (preboarding.get(item.code) || 0),
        },
      }))
    }
    if (entity === 'preboarding-packages') {
      const vacancyUse = await prisma.vacancy.groupBy({
        by: ['preboardingPackageId'],
        where: { preboardingPackageId: { not: null } },
        _count: { _all: true },
      })
      const vacancies = new Map(vacancyUse.map((row) => [row.preboardingPackageId, row._count._all]))
      items = items.map((item: any) => ({ ...item, usage: { vacancies: vacancies.get(item.id) || 0 } }))
    }
    return NextResponse.json({ items, truncated: items.length === MAX_ITEMS })
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
    if (IMMUTABLE_ENTITIES.has(entity)) {
      throw new AuthzError('This platform configuration is product-defined and cannot be created here', 409)
    }

    const writable = coerce(cfg.fields, data)
    validateEntityValues(entity, writable)
    if (entity === 'document-requirements') {
      writable.required = true
      writable.reviewRequired = true
      const documentType = await prisma.documentType.findFirst({
        where: { code: writable.documentType, active: true },
        select: { id: true },
      })
      if (!documentType) throw new AuthzError('Choose an active document type', 422)
    }
    if (entity === 'forms') {
      writable.required = true
      writable.reviewRequired = true
      if (writable.active) throw new AuthzError('Create the form as inactive, then submit activation for review', 422)
    }
    if ((entity === 'notification-templates' || entity === 'email-templates') && writable.active) {
      throw new AuthzError('Create the message template as inactive, then submit activation for review', 422)
    }
    if (entity === 'policies') {
      if (writable.active) throw new AuthzError('Create the policy as inactive, then submit activation for review', 422)
      const file = await prisma.fileAsset.findFirst({
        where: {
          id: writable.fileAssetId,
          ownerUserId: user.userId,
          virusScanStatus: 'CLEAN',
          mimeType: 'application/pdf',
        },
        select: { id: true },
      })
      if (!file) throw new AuthzError('Attach a clean official PDF uploaded by you', 422)
    }
    if (entity === 'preboarding-packages') {
      writable.candidateType = 'GENERAL'
      writable.roleCategory = null
      if (writable.active)
        throw new AuthzError('Create the package as inactive, add its requirements, then submit activation for review', 422)
    }
    if (entity === 'scorecards') writable.active = false
    if (entity === 'templates') writable.active = false
    if (entity === 'tasks') {
      writable.category = 'GENERAL'
      writable.required = true
      writable.active = false
    }
    if (entity === 'duty-stations') {
      const duplicate = await prisma.dutyStation.findFirst({
        where: {
          name: { equals: writable.name },
          state: { equals: writable.state },
          lga: writable.lga || null,
        },
        select: { id: true },
      })
      if (duplicate) throw new AuthzError('This location already exists', 409)
    }
    if (entity === 'courses' && writable.active) {
      throw new AuthzError('Create the course as inactive, add its content, then submit activation for review', 422)
    }
    const created = await model(entity).create({ data: writable })
    await logAudit({
      actorUserId: user.userId,
      action: 'ADMIN_CREATE',
      resourceType: cfg.model,
      resourceId: created.id,
      newValue: created,
    })
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
    if (IMMUTABLE_ENTITIES.has(entity)) {
      throw new AuthzError('This platform configuration is product-defined and cannot be edited here', 409)
    }

    const previous = await model(entity).findUnique({ where: { id } })
    if (!previous) throw new AuthzError('Configuration record not found', 404)
    const writable = coerce(cfg.fields, data)
    validateEntityValues(entity, writable)
    if (
      entity === 'document-requirements' &&
      writable.documentType !== undefined &&
      writable.documentType !== previous.documentType
    ) {
      const documentType = await prisma.documentType.findFirst({
        where: { code: writable.documentType, active: true },
        select: { id: true },
      })
      if (!documentType) throw new AuthzError('Choose an active document type', 422)
    }
    if (entity === 'contract-types' && writable.code && writable.code !== previous.code) {
      const vacancies = await prisma.vacancy.count({ where: { contractType: previous.code } })
      if (vacancies) {
        throw new AuthzError('The code cannot change because existing vacancies use it. Change the name instead.', 409)
      }
    }
    if (entity === 'departments' && writable.code && writable.code !== previous.code) {
      const vacancies = await prisma.vacancy.count({ where: { departmentId: id } })
      if (vacancies) {
        throw new AuthzError(
          'The reporting code cannot change because vacancies already use this department. Change the name or create a new department.',
          409
        )
      }
    }
    if (entity === 'projects' && writable.code && writable.code !== previous.code) {
      const vacancies = await prisma.vacancy.count({ where: { projectId: id } })
      if (vacancies) {
        throw new AuthzError(
          'The reporting code cannot change because vacancies already use this project. Change the name or create a new project.',
          409
        )
      }
    }
    if (entity === 'document-types' && writable.code && writable.code !== previous.code) {
      const [candidateDocuments, vacancyRequirements, preboardingRequirements] = await Promise.all([
        prisma.candidateDocument.count({ where: { documentType: previous.code } }),
        prisma.vacancyRequiredDocument.count({ where: { documentType: previous.code } }),
        prisma.documentRequirement.count({ where: { documentType: previous.code } }),
      ])
      if (candidateDocuments + vacancyRequirements + preboardingRequirements > 0) {
        throw new AuthzError(
          'The stable code cannot change because existing documents or requirements use it. Change the name or create a new type.',
          409
        )
      }
    }
    if (
      entity === 'scorecards' &&
      writable.scorecardType !== undefined &&
      writable.scorecardType !== previous.scorecardType
    ) {
      const [assessments, screeningVacancies, interviewVacancies] = await Promise.all([
        prisma.candidateScorecard.count({ where: { scorecardTemplateId: id } }),
        prisma.vacancy.count({ where: { screeningScorecardTemplateId: id } }),
        prisma.vacancy.count({ where: { interviewScorecardTemplateId: id } }),
      ])
      if (assessments + screeningVacancies + interviewVacancies > 0)
        throw new AuthzError(
          'The selection stage cannot change because this scorecard is already assigned or has recorded assessments. Create a new scorecard.',
          409
        )
    }
    if (entity === 'vacancy-categories' && writable.code && writable.code !== previous.code) {
      const vacancies = await prisma.vacancy.count({ where: { categoryId: id } })
      if (vacancies)
        throw new AuthzError(
          'The reporting code cannot change because vacancies already use this job family. Change the name or create a new family.',
          409
        )
    }
    if (entity === 'duty-stations') {
      const identityChanged = ['name', 'state', 'lga'].some(
        (field) => writable[field] !== undefined && (writable[field] || null) !== (previous[field] || null)
      )
      if (identityChanged) {
        const vacancies = await prisma.vacancy.count({ where: { dutyStationId: id } })
        if (vacancies) {
          throw new AuthzError(
            'The location identity cannot change because vacancies already use it. Correct the address or create a new location.',
            409
          )
        }
      }
      const duplicate = await prisma.dutyStation.findFirst({
        where: {
          id: { not: id },
          name: { equals: writable.name ?? previous.name },
          state: { equals: writable.state ?? previous.state },
          lga: writable.lga !== undefined ? writable.lga || null : previous.lga,
        },
        select: { id: true },
      })
      if (duplicate) throw new AuthzError('This location already exists', 409)
    }
    const updated = cfg.versioned
      ? await prisma.$transaction(async (tx) => {
          await tx.entityVersion.upsert({
            where: { entityType_entityId_version: { entityType: cfg.model, entityId: id, version: previous.version } },
            update: {},
            create: {
              entityType: cfg.model,
              entityId: id,
              version: previous.version,
              snapshotJson: JSON.stringify(previous),
              changeReason: 'Administrative update',
              createdBy: user.userId,
            },
          })
          return (tx as any)[cfg.model].update({ where: { id }, data: { ...writable, version: { increment: 1 } } })
        })
      : await model(entity).update({ where: { id }, data: writable })
    await logAudit({
      actorUserId: user.userId,
      action: 'ADMIN_UPDATE',
      resourceType: cfg.model,
      resourceId: id,
      previousValue: previous,
      newValue: updated,
    })
    return NextResponse.json({ success: true, item: updated })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const { entity, id, reason } = await parseBody(request, adminDeleteSchema)
    const user = await authorizeEntity(entity)
    const cfg = ENTITIES[entity]
    if (!cfg) return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })

    // Soft-delete when the model supports `active`, else hard delete.
    let result
    if ('active' in cfg.fields) {
      result = await model(entity).update({ where: { id }, data: { active: false } })
    } else if (DELETE_PROTECTED_ENTITIES.has(entity)) {
      throw new AuthzError(
        `${entity} records cannot be deleted through the configuration endpoint because removing them silently changes access control or runtime behaviour`,
        409
      )
    } else {
      result = await model(entity).delete({ where: { id } })
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'ADMIN_DELETE',
      resourceType: cfg.model,
      resourceId: id,
      reason,
    })
    return NextResponse.json({ success: true, item: result })
  } catch (err) {
    return authzResponse(err)
  }
}
