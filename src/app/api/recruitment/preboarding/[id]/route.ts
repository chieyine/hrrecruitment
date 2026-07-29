import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
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
          select: {
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { title: true, referenceNumber: true } },
          },
        },
      },
    })
    if (!preboarding) return NextResponse.json({ error: 'Preboarding record not found' }, { status: 404 })
    const [canReadRestricted, canClearance] = await Promise.all([
      hasPermission(user.userId, 'preboarding.restricted.read'),
      hasPermission(user.userId, 'preboarding.clearance'),
    ])
    if (!canReadRestricted) {
      preboarding.forms = preboarding.forms.map((form) =>
        form.formTemplate.sensitivityClass === 'RESTRICTED' ? { ...form, responseJson: null } : form
      )
    }
    const [packages, requirements] = await Promise.all([
      prisma.preboardingPackage.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.documentRequirement.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])
    return NextResponse.json({
      preboarding,
      packages,
      requirements,
      capabilities: {
        canWaive: user.roles.includes('HR_MANAGER'),
        canClearance,
      },
    })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('preboarding.manage')
    const body = await request.json()
    const checkId = String(body.checkId || '')
    const reason = String(body.reason || '').trim()
    await requireRole('HR_MANAGER')
    if (!checkId || reason.length < 10)
      return NextResponse.json({ error: 'A waiver and reason of at least 10 characters are required' }, { status: 400 })
    const check = await prisma.readinessCheck.findFirst({ where: { id: checkId, candidatePreboardingId: params.id } })
    if (!check) return NextResponse.json({ error: 'Readiness check not found' }, { status: 404 })

    const updated = await prisma.readinessCheck.update({
      where: { id: check.id },
      data: {
        status: 'WAIVED',
        reviewedAt: new Date(),
        waivedBy: user.userId,
        waiverReason: reason,
        waivedAt: new Date(),
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'READINESS_CHECK_WAIVED',
      resourceType: 'ReadinessCheck',
      resourceId: check.id,
      previousValue: check,
      newValue: updated,
      reason: reason || undefined,
    })
    return NextResponse.json({ success: true, check: updated })
  } catch (err) {
    return authzResponse(err)
  }
}
