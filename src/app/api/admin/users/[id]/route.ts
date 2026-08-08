import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { STAFF_ROLE_NAMES } from '@/lib/roles'

const schema = z
  .object({
    accountStatus: z.enum(['ACTIVE', 'LOCKED', 'SUSPENDED']).optional(),
    roleId: z.string().optional(),
    removeAssignmentId: z.string().optional(),
    reason: z.string().trim().min(5).max(500).optional(),
  })
  .superRefine((value, context) => {
    if (!value.accountStatus && !value.roleId && !value.removeAssignmentId)
      context.addIssue({ code: 'custom', message: 'No user change supplied' })
    if ((value.accountStatus || value.removeAssignmentId) && !value.reason)
      context.addIssue({ code: 'custom', path: ['reason'], message: 'Explain why this access change is needed' })
  })

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const actor = await requireRole('SYSTEM_ADMIN')
    const data = await parseBody(request, schema)
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      include: { userRoles: { include: { role: true } } },
    })
    if (!target) throw new AuthzError('User not found', 404)
    if (actor.userId === target.id && data.accountStatus && data.accountStatus !== 'ACTIVE')
      throw new AuthzError('You cannot lock or suspend your own administrator account', 409)
    const targetIsGlobalAdmin = target.userRoles.some(
      (assignment) => assignment.role.name === 'SYSTEM_ADMIN' && (assignment.scopeType || 'GLOBAL') === 'GLOBAL'
    )
    const removingGlobalAdmin =
      data.removeAssignmentId &&
      target.userRoles.some(
        (assignment) =>
          assignment.id === data.removeAssignmentId &&
          assignment.role.name === 'SYSTEM_ADMIN' &&
          (assignment.scopeType || 'GLOBAL') === 'GLOBAL'
      )
    if (targetIsGlobalAdmin && (removingGlobalAdmin || (data.accountStatus && data.accountStatus !== 'ACTIVE'))) {
      const otherActiveAdmins = await prisma.user.count({
        where: {
          id: { not: target.id },
          accountStatus: 'ACTIVE',
          userRoles: {
            some: {
              scopeType: 'GLOBAL',
              role: { name: 'SYSTEM_ADMIN' },
            },
          },
        },
      })
      if (!otherActiveAdmins) throw new AuthzError('At least one active global system administrator must remain', 409)
    }
    let accessChanged = false
    if (data.removeAssignmentId) {
      const role = target.userRoles.find((assignment) => assignment.id === data.removeAssignmentId)
      if (!role) throw new AuthzError('Role assignment not found', 404)
      if (actor.userId === target.id && role.role.name === 'SYSTEM_ADMIN')
        throw new AuthzError('You cannot remove your own system administrator role', 409)
      await prisma.userRole.delete({ where: { id: role.id } })
      accessChanged = true
    }
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } })
      if (!role) throw new AuthzError('Role not found', 404)
      if (!(STAFF_ROLE_NAMES as readonly string[]).includes(role.name))
        throw new AuthzError('Candidate and public identities cannot be assigned as staff access', 422)
      const externalIdentityRoles = target.userRoles.filter((assignment) =>
        ['CANDIDATE', 'PUBLIC'].includes(assignment.role.name)
      )
      if (externalIdentityRoles.length)
        throw new AuthzError('Use a separate staff account; candidate identities cannot receive staff access', 409)
      const scopeType = 'GLOBAL'
      const scopeId = 'GLOBAL'
      const otherRoleAssignments = target.userRoles.filter((assignment) => assignment.roleId !== role.id)
      if (role.name === 'SYSTEM_ADMIN' && otherRoleAssignments.length > 0) {
        throw new AuthzError(
          'System administration must use a separate account from recruitment and candidate roles',
          409
        )
      }
      if (role.name !== 'SYSTEM_ADMIN' && targetIsGlobalAdmin) {
        throw new AuthzError(
          'Remove the system administrator role before assigning an operational role to this account',
          409
        )
      }
      await prisma.userRole.upsert({
        where: { userId_roleId_scopeType_scopeId: { userId: target.id, roleId: data.roleId, scopeType, scopeId } },
        update: {},
        create: { userId: target.id, roleId: data.roleId, scopeType, scopeId },
      })
      accessChanged = true
    }
    const updated =
      data.accountStatus || accessChanged
        ? await prisma.user.update({
            where: { id: target.id },
            data: {
              accountStatus: data.accountStatus,
              ...(data.accountStatus === 'ACTIVE'
                ? { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null }
                : {}),
              sessionVersion: { increment: 1 },
            },
          })
        : target
    await logAudit({
      actorUserId: actor.userId,
      action: 'USER_ACCESS_CHANGED',
      resourceType: 'User',
      resourceId: target.id,
      previousValue: {
        accountStatus: target.accountStatus,
        roles: target.userRoles.map((assignment) => assignment.role.name),
      },
      reason: data.reason,
      newValue: { ...data, reason: undefined },
    })
    return Response.json({ success: true, user: updated })
  } catch (error) {
    return authzResponse(error)
  }
}
