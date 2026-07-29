import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { hasPermission } from '@/lib/rbac'

const prisma = new PrismaClient()
const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function makeVacancy() {
  const owner = await prisma.user.create({ data: { email: `owner-${uniq()}@t.com`, passwordHash: 'x' } })
  const dept = await prisma.department.create({ data: { name: `Dept ${uniq()}`, code: `C${uniq()}` } })
  const station = await prisma.dutyStation.create({ data: { name: `Station ${uniq()}`, state: 'FCT' } })
  const vacancy = await prisma.vacancy.create({
    data: {
      referenceNumber: `REF-${uniq()}`,
      title: 'Test Officer',
      departmentId: dept.id,
      dutyStationId: station.id,
      contractType: 'PERMANENT',
      summary: 's',
      responsibilities: 'r',
      essentialQualifications: 'e',
      openingAt: new Date(),
      closingAt: new Date(Date.now() + 86_400_000),
      ownerUserId: owner.id,
    },
  })
  return vacancy
}

async function makeCandidate() {
  const user = await prisma.user.create({ data: { email: `cand-${uniq()}@t.com`, passwordHash: 'x' } })
  const profile = await prisma.candidateProfile.create({
    data: { userId: user.id, legalFirstName: 'Test', lastName: 'Candidate' },
  })
  return profile
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('application invariants', () => {
  it('enforces one application per candidate + vacancy', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()

    await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })
    await expect(
      prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })
    ).rejects.toBeTruthy()
  })

  it('cascades delete from vacancy to its applications', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()
    const app = await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })

    await prisma.vacancy.delete({ where: { id: vacancy.id } })
    const found = await prisma.application.findUnique({ where: { id: app.id } })
    expect(found).toBeNull()
  })
})

describe('preboarding & readiness', () => {
  it('upserts a single preboarding per application and seeds readiness checks', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()
    const app = await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })

    const pb = await prisma.candidatePreboarding.upsert({
      where: { applicationId: app.id },
      update: { status: 'IN_PROGRESS' },
      create: { applicationId: app.id, status: 'IN_PROGRESS' },
    })

    for (const checkType of ['OFFER_ACCEPTED', 'HR_REVIEW']) {
      await prisma.readinessCheck.create({
        data: {
          candidatePreboardingId: pb.id,
          checkType,
          required: true,
          status: checkType === 'OFFER_ACCEPTED' ? 'PASSED' : 'PENDING',
        },
      })
    }

    // applicationId is unique — a second upsert must not create a duplicate.
    const pb2 = await prisma.candidatePreboarding.upsert({
      where: { applicationId: app.id },
      update: { status: 'AWAITING_HR_REVIEW' },
      create: { applicationId: app.id, status: 'IN_PROGRESS' },
    })
    expect(pb2.id).toBe(pb.id)

    const outstanding = await prisma.readinessCheck.count({
      where: { candidatePreboardingId: pb.id, required: true, status: { notIn: ['PASSED', 'WAIVED'] } },
    })
    expect(outstanding).toBe(1) // HR_REVIEW still pending
  })
})

describe('offer relation', () => {
  it('creates an offer linked to its application', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()
    const app = await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })

    const offer = await prisma.offer.create({
      data: {
        applicationId: app.id,
        position: 'Test Officer',
        dutyStation: 'HQ',
        contractType: 'PERMANENT',
        salary: '100',
        startDate: new Date(),
        acceptanceDeadline: new Date(Date.now() + 86_400_000),
        status: 'SENT',
      },
    })
    expect(offer.applicationId).toBe(app.id)

    const withOffers = await prisma.application.findUnique({
      where: { id: app.id },
      include: { offers: true },
    })
    expect(withOffers?.offers).toHaveLength(1)
  })
})

describe('reliability and governance controls', () => {
  it('limits a system-admin account to technical control-plane permissions', async () => {
    const user = await prisma.user.create({ data: { email: `system-admin-${uniq()}@t.com`, passwordHash: 'x' } })
    const role = await prisma.role.upsert({
      where: { name: 'SYSTEM_ADMIN' },
      update: {},
      create: { name: 'SYSTEM_ADMIN', description: 'System administrator' },
    })
    const wildcard = await prisma.permission.upsert({ where: { code: '*' }, update: {}, create: { code: '*' } })
    const technicalPermissions = await Promise.all(
      ['admin.manage', 'audit.read', 'governance.manage'].map((code) =>
        prisma.permission.upsert({ where: { code }, update: {}, create: { code } })
      )
    )
    await prisma.rolePermission.createMany({
      data: [wildcard, ...technicalPermissions].map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    })
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, scopeType: 'GLOBAL', scopeId: 'GLOBAL' } })
    const hrRole = await prisma.role.upsert({
      where: { name: 'HR_MANAGER' },
      update: {},
      create: { name: 'HR_MANAGER', description: 'HR manager' },
    })
    const vacancyUpdate = await prisma.permission.upsert({
      where: { code: 'vacancy.update.all' },
      update: {},
      create: { code: 'vacancy.update.all' },
    })
    await prisma.rolePermission.createMany({
      data: [{ roleId: hrRole.id, permissionId: vacancyUpdate.id }],
      skipDuplicates: true,
    })
    await prisma.userRole.create({
      data: { userId: user.id, roleId: hrRole.id, scopeType: 'GLOBAL', scopeId: 'GLOBAL' },
    })
    expect(await hasPermission(user.id, 'admin.manage')).toBe(true)
    expect(await hasPermission(user.id, 'audit.read')).toBe(true)
    expect(await hasPermission(user.id, 'governance.manage')).toBe(true)
    expect(await hasPermission(user.id, 'vacancy.create.all')).toBe(false)
    expect(await hasPermission(user.id, 'vacancy.read.all')).toBe(false)
    // Even an accidental second HR role must not turn the technical account
    // into a recruitment decision-maker.
    expect(await hasPermission(user.id, 'vacancy.update.all')).toBe(false)
    expect(await hasPermission(user.id, 'preboarding.restricted.read')).toBe(false)
    expect(await hasPermission(user.id, 'application.read.all')).toBe(false)
    expect(await hasPermission(user.id, 'application.stage.change')).toBe(false)
    expect(await hasPermission(user.id, 'reference.manage')).toBe(false)
    expect(await hasPermission(user.id, 'offer.manage')).toBe(false)
    expect(await hasPermission(user.id, 'report.export')).toBe(false)
    expect(await hasPermission(user.id, 'complaint.manage')).toBe(false)
  })
  it('enforces outbox deduplication keys', async () => {
    const key = `notification-${uniq()}`
    await prisma.outboxMessage.create({
      data: { channel: 'EMAIL', recipient: 'person@example.org', payloadJson: '{}', deduplicationKey: key },
    })
    await expect(
      prisma.outboxMessage.create({
        data: { channel: 'EMAIL', recipient: 'person@example.org', payloadJson: '{}', deduplicationKey: key },
      })
    ).rejects.toBeTruthy()
  })

  it('rejects an optimistic update that uses a stale application version', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()
    const application = await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })
    const first = await prisma.application.updateMany({
      where: { id: application.id, lockVersion: application.lockVersion },
      data: { lockVersion: { increment: 1 } },
    })
    const stale = await prisma.application.updateMany({
      where: { id: application.id, lockVersion: application.lockVersion },
      data: { lockVersion: { increment: 1 } },
    })
    expect(first.count).toBe(1)
    expect(stale.count).toBe(0)
  })

  it('records legal holds and retention evidence runs', async () => {
    const actor = await prisma.user.create({ data: { email: `governance-${uniq()}@t.com`, passwordHash: 'x' } })
    const hold = await prisma.legalHold.create({
      data: {
        resourceType: 'USER',
        resourceId: actor.id,
        reason: 'Active investigation evidence preservation',
        placedBy: actor.id,
      },
    })
    const run = await prisma.retentionRun.create({
      data: {
        policyVersion: 'test-v1',
        status: 'COMPLETED',
        completedAt: new Date(),
        summaryJson: '{}',
        evidenceHash: 'abc123',
      },
    })
    expect(hold.status).toBe('ACTIVE')
    expect(run.evidenceHash).toBe('abc123')
  })

  it('preserves assigned preboarding configuration snapshots', async () => {
    const vacancy = await makeVacancy()
    const candidate = await makeCandidate()
    const application = await prisma.application.create({ data: { candidateId: candidate.id, vacancyId: vacancy.id } })
    const preboarding = await prisma.candidatePreboarding.create({ data: { applicationId: application.id } })
    const template = await prisma.preboardingFormTemplate.create({
      data: { title: `Personal details ${uniq()}`, schemaJson: '{}' },
    })
    const assigned = await prisma.candidatePreboardingForm.create({
      data: {
        candidatePreboardingId: preboarding.id,
        formTemplateId: template.id,
        templateSnapshotJson: JSON.stringify({ title: template.title }),
      },
    })
    await prisma.preboardingFormTemplate.update({ where: { id: template.id }, data: { title: 'Changed later' } })
    expect(JSON.parse(assigned.templateSnapshotJson || '{}').title).toBe(template.title)
  })

  it('deduplicates operational work and enforces optimistic work updates', async () => {
    const key = `application-review:${uniq()}`
    const work = await prisma.workItem.create({
      data: {
        deduplicationKey: key,
        workType: 'APPLICATION_REVIEW',
        title: 'Review candidate',
        resourceType: 'APPLICATION',
        resourceId: uniq(),
      },
    })
    await expect(
      prisma.workItem.create({
        data: {
          deduplicationKey: key,
          workType: 'APPLICATION_REVIEW',
          title: 'Duplicate',
          resourceType: 'APPLICATION',
          resourceId: uniq(),
        },
      })
    ).rejects.toBeTruthy()
    const claimed = await prisma.workItem.updateMany({
      where: { id: work.id, lockVersion: 1 },
      data: { status: 'IN_PROGRESS', lockVersion: { increment: 1 } },
    })
    const stale = await prisma.workItem.updateMany({
      where: { id: work.id, lockVersion: 1 },
      data: { status: 'COMPLETED' },
    })
    expect(claimed.count).toBe(1)
    expect(stale.count).toBe(0)
  })

  it('prevents reuse of an ERP personnel number across candidates', async () => {
    const firstApplication = await prisma.application.create({
      data: { candidateId: (await makeCandidate()).id, vacancyId: (await makeVacancy()).id },
    })
    const secondApplication = await prisma.application.create({
      data: { candidateId: (await makeCandidate()).id, vacancyId: (await makeVacancy()).id },
    })
    const personnelNumber = `ERP-${uniq()}`
    await prisma.eRPTransferRecord.create({
      data: { applicationId: firstApplication.id, erpPersonnelNumber: personnelNumber, recordedBy: 'test' },
    })
    await expect(
      prisma.eRPTransferRecord.create({
        data: { applicationId: secondApplication.id, erpPersonnelNumber: personnelNumber, recordedBy: 'test' },
      })
    ).rejects.toBeTruthy()
  })

  it('records consent-led talent pool membership once per pool and candidate', async () => {
    const candidate = await makeCandidate()
    const actor = await prisma.user.create({ data: { email: `pool-owner-${uniq()}@t.com`, passwordHash: 'x' } })
    await prisma.consentRecord.create({
      data: { candidateId: candidate.id, consentType: 'TALENT_POOL', noticeVersion: 'test', decision: true },
    })
    const pool = await prisma.talentPool.create({ data: { name: `Pool ${uniq()}`, createdBy: actor.id } })
    await prisma.talentPoolMember.create({
      data: { talentPoolId: pool.id, candidateId: candidate.id, addedBy: actor.id },
    })
    await expect(
      prisma.talentPoolMember.create({ data: { talentPoolId: pool.id, candidateId: candidate.id, addedBy: actor.id } })
    ).rejects.toBeTruthy()
  })

  it('records governed automation modes and every considered action', async () => {
    const actor = await prisma.user.create({ data: { email: `automation-owner-${uniq()}@t.com`, passwordHash: 'x' } })
    const code = `TEST_AUTOMATION_${uniq()}`
    const control = await prisma.automationControl.create({
      data: { code, name: 'Test automation', description: 'Integration test', mode: 'PREVIEW', updatedBy: actor.id },
    })
    const action = await prisma.automationActionLog.create({
      data: {
        automationCode: code,
        action: 'REMIND',
        targetType: 'Application',
        targetId: uniq(),
        status: 'PREVIEWED',
      },
    })
    expect(control.mode).toBe('PREVIEW')
    expect(action.status).toBe('PREVIEWED')
  })

  it('stores configuration release scheduling and rollback evidence', async () => {
    const actor = await prisma.user.create({ data: { email: `release-owner-${uniq()}@t.com`, passwordHash: 'x' } })
    const release = await prisma.configurationChangeRequest.create({
      data: {
        changeType: 'GENERIC_CONFIG_UPDATE:policies',
        resourceId: uniq(),
        proposedJson: '{"active":true}',
        previousJson: '{"active":false}',
        reason: 'Controlled integration-test release',
        status: 'DRAFT',
        requestedBy: actor.id,
        scheduledFor: new Date(Date.now() + 86_400_000),
        effectiveFrom: new Date(Date.now() + 86_400_000),
      },
    })
    expect(release.previousJson).toContain('false')
    expect(release.scheduledFor).toBeTruthy()
  })

  it('retains bulk-action receipts and prevents duplicate merge reviews', async () => {
    const actor = await prisma.user.create({ data: { email: `bulk-owner-${uniq()}@t.com`, passwordHash: 'x' } })
    const run = await prisma.bulkActionRun.create({
      data: {
        actionType: 'ASSIGN_REVIEWER',
        requestedBy: actor.id,
        requestedCount: 2,
        eligibleCount: 1,
        failedCount: 1,
        status: 'PARTIAL',
        requestJson: '{}',
        resultJson: '{}',
        reversibleUntil: new Date(Date.now() + 900_000),
      },
    })
    expect(run.failedCount).toBe(1)
    const primary = await makeCandidate()
    const duplicate = await makeCandidate()
    await prisma.candidateMergeReview.create({
      data: {
        primaryCandidateId: primary.id,
        duplicateCandidateId: duplicate.id,
        requestedBy: actor.id,
        previewJson: '{}',
        reason: 'Possible duplicate candidates for integration test',
      },
    })
    await expect(
      prisma.candidateMergeReview.create({
        data: {
          primaryCandidateId: primary.id,
          duplicateCandidateId: duplicate.id,
          requestedBy: actor.id,
          previewJson: '{}',
          reason: 'Duplicate review must not be created twice',
        },
      })
    ).rejects.toBeTruthy()
  })
})
