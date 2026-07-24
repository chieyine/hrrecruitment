import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const schema = z.object({ accountStatus: z.enum(['ACTIVE', 'LOCKED', 'SUSPENDED']).optional(), roleId: z.string().optional(), removeRoleId: z.string().optional(), scopeType: z.enum(['GLOBAL', 'DEPARTMENT', 'VACANCY', 'DUTY_STATION']).optional().default('GLOBAL'), scopeId: z.string().optional().default('GLOBAL') }).refine((value) => value.accountStatus || value.roleId || value.removeRoleId, 'No user change supplied')

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const actor = await requireRole('SYSTEM_ADMIN')
    const data = await parseBody(request, schema)
    const target = await prisma.user.findUnique({ where: { id: params.id }, include: { userRoles: { include: { role: true } } } })
    if (!target) throw new AuthzError('User not found', 404)
    if (actor.userId === target.id && data.accountStatus && data.accountStatus !== 'ACTIVE') throw new AuthzError('You cannot lock or suspend your own administrator account', 409)
    const targetIsGlobalAdmin = target.userRoles.some((assignment) =>
      assignment.role.name === 'SYSTEM_ADMIN' && (assignment.scopeType || 'GLOBAL') === 'GLOBAL'
    )
    const removingGlobalAdmin = data.removeRoleId && target.userRoles.some((assignment) =>
      assignment.roleId === data.removeRoleId &&
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
    if (data.removeRoleId) {
      const role = target.userRoles.find((assignment) => assignment.roleId === data.removeRoleId)
      if (!role) throw new AuthzError('Role assignment not found', 404)
      if (actor.userId === target.id && role.role.name === 'SYSTEM_ADMIN') throw new AuthzError('You cannot remove your own system administrator role', 409)
      await prisma.userRole.delete({ where: { id: role.id } })
      accessChanged = true
    }
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } })
      if (!role) throw new AuthzError('Role not found', 404)
      const scopeType = data.scopeType || 'GLOBAL'
      const scopeId = scopeType === 'GLOBAL' ? 'GLOBAL' : data.scopeId
      if (!scopeId || scopeId === 'GLOBAL') throw new AuthzError(`${scopeType.replaceAll('_', ' ')} scope requires a specific record`, 400)
      if (role.name === 'SYSTEM_ADMIN' && scopeType !== 'GLOBAL') throw new AuthzError('System administrator is a global role', 400)
      if (scopeType !== 'GLOBAL') {
        const exists = scopeType === 'DEPARTMENT'
          ? await prisma.department.findUnique({ where: { id: scopeId }, select: { id: true } })
          : scopeType === 'VACANCY'
            ? await prisma.vacancy.findUnique({ where: { id: scopeId }, select: { id: true } })
            : await prisma.dutyStation.findUnique({ where: { id: scopeId }, select: { id: true } })
        if (!exists) throw new AuthzError(`${scopeType.replaceAll('_', ' ')} scope not found`, 404)
      }
      await prisma.userRole.upsert({
        where: { userId_roleId_scopeType_scopeId: { userId: target.id, roleId: data.roleId, scopeType, scopeId } },
        update: {},
        create: { userId: target.id, roleId: data.roleId, scopeType, scopeId },
      })
      accessChanged = true
    }
    const updated = (data.accountStatus || accessChanged) ? await prisma.user.update({ where: { id: target.id }, data: { accountStatus: data.accountStatus, sessionVersion: { increment: 1 } } }) : target
    await logAudit({ actorUserId: actor.userId, action: 'USER_ACCESS_CHANGED', resourceType: 'User', resourceId: target.id, previousValue: { accountStatus: target.accountStatus, roles: target.userRoles.map((assignment) => assignment.role.name) }, newValue: data })
    return Response.json({ success: true, user: updated })
  } catch (error) { return authzResponse(error) }
}
