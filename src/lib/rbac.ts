import { prisma } from './prisma'

/**
 * System administration is a technical control-plane role. It must never
 * inherit recruitment authority from a wildcard or from a second role on the
 * same account. People who also perform HR work need a separate HR account so
 * decisions retain an unambiguous actor and separation of duties.
 */
const SYSTEM_ADMIN_PERMISSIONS = new Set(['admin.manage', 'audit.read', 'governance.manage'])

export async function allowedPermissions(
  userId: string,
  requiredPermissionCodes: readonly string[],
  scope?: { type?: string; id?: string }
): Promise<Set<string>> {
  const required = new Set(requiredPermissionCodes)
  const allowed = new Set<string>()
  if (!required.size) return allowed
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const isSystemAdmin = userRoles.some((assignment) => assignment.role.name === 'SYSTEM_ADMIN')

  for (const ur of userRoles) {
    // A system-admin account may exercise only the technical permission set,
    // even when it has accidentally also been assigned an operational role.
    if (isSystemAdmin && ur.role.name !== 'SYSTEM_ADMIN') continue

    const assignmentScope = ur.scopeType || 'GLOBAL'
    if (assignmentScope !== 'GLOBAL') {
      // Scoped assignments never become global merely because a caller omitted
      // resource context. Fail closed until the exact resource scope is supplied.
      if (!scope?.type || !scope.id || assignmentScope !== scope.type || ur.scopeId !== scope.id) continue
    }

    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.code === '*') {
        for (const code of required) {
          if (!isSystemAdmin || SYSTEM_ADMIN_PERMISSIONS.has(code)) allowed.add(code)
        }
      } else if (
        required.has(rp.permission.code) &&
        (!isSystemAdmin || SYSTEM_ADMIN_PERMISSIONS.has(rp.permission.code))
      )
        allowed.add(rp.permission.code)
    }
  }

  return allowed
}

export async function hasPermission(
  userId: string,
  requiredPermissionCode: string,
  scope?: { type?: string; id?: string }
): Promise<boolean> {
  return (await allowedPermissions(userId, [requiredPermissionCode], scope)).has(requiredPermissionCode)
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })
  return userRoles.map((ur) => ur.role.name)
}
