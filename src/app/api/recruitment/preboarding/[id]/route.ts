import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requirePermission('preboarding.manage')
    const preboarding = await prisma.candidatePreboarding.findUnique({
      where: { id: params.id },
      include: {
        readinessChecks: true,
        forms: { include: { formTemplate: true } },
        documents: { include: { documentRequirement: true } },
        policyAcknowledgements: { include: { policyDocument: true } },
        courses: { include: { course: true } },
        tasks: { include: { taskTemplate: true } },
        infoItems: true,
        meetings: true,
        application: {
          include: {
            candidate: true,
            vacancy: { select: { title: true, referenceNumber: true } },
          },
        },
      },
    })
    if (!preboarding) return NextResponse.json({ error: 'Preboarding record not found' }, { status: 404 })
    const canReadRestricted = await hasPermission(user.userId, 'preboarding.restricted.read')
    if (!canReadRestricted) {
      preboarding.forms = preboarding.forms.map((form) => form.formTemplate.sensitivityClass === 'RESTRICTED' ? { ...form, responseJson: null } : form)
    }
    const [packages, requirements] = await Promise.all([prisma.preboardingPackage.findMany({ where: { active: true }, orderBy: { name: 'asc' } }), prisma.documentRequirement.findMany({ where: { active: true }, orderBy: { name: 'asc' } })])
    return NextResponse.json({ preboarding, packages, requirements })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requirePermission('preboarding.manage')
    const body = await request.json()
    const checkId = String(body.checkId || '')
    const status = String(body.status || '')
    const reason = String(body.reason || '').trim()
    if (!checkId || !['PASSED', 'FAILED', 'PENDING', 'WAIVED'].includes(status)) {
      return NextResponse.json({ error: 'A valid checkId and status are required' }, { status: 400 })
    }
    if (status === 'WAIVED') {
      await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
      if (!reason) return NextResponse.json({ error: 'A waiver reason is required' }, { status: 400 })
    }
    const check = await prisma.readinessCheck.findFirst({ where: { id: checkId, candidatePreboardingId: params.id } })
    if (!check) return NextResponse.json({ error: 'Readiness check not found' }, { status: 404 })

    const updated = await prisma.readinessCheck.update({
      where: { id: check.id },
      data: {
        status,
        reviewedAt: new Date(),
        waivedBy: status === 'WAIVED' ? user.userId : null,
        waiverReason: status === 'WAIVED' ? reason : null,
        waivedAt: status === 'WAIVED' ? new Date() : null,
      },
    })
    await logAudit({ actorUserId: user.userId, action: status === 'WAIVED' ? 'READINESS_CHECK_WAIVED' : 'READINESS_CHECK_REVIEWED', resourceType: 'ReadinessCheck', resourceId: check.id, previousValue: check, newValue: updated, reason: reason || undefined })
    return NextResponse.json({ success: true, check: updated })
  } catch (err) {
    return authzResponse(err)
  }
}
