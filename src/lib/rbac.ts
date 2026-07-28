import { prisma } from './prisma'

// Infrastructure administration does not imply access to confidential case
// content. These permissions must always be granted explicitly to a role.
const EXPLICIT_ONLY_PERMISSIONS = new Set([
  // A system administrator operates the platform; that role is not an
  // automatic member of a recruitment case team. Case permissions must be
  // granted separately when the same person also performs an HR role.
  'application.read.assigned',
  'application.read.all',
  'application.stage.change',
  'scorecard.submit',
  'scorecard.reopen',
  'assessment.manage',
  'interview.manage',
  'interview.score.assigned',
  'preboarding.restricted.read',
  'reference.manage',
  'offer.manage',
  'preboarding.manage',
  'preboarding.clearance',
  'resumption.confirm',
  'erp.transfer',
  'report.export',
  'complaint.manage',
])

export async function hasPermission(
  userId: string,
  requiredPermissionCode: string,
  scope?: { type?: string; id?: string }
): Promise<boolean> {
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

  for (const ur of userRoles) {
    const assignmentScope = ur.scopeType || 'GLOBAL'
    if (assignmentScope !== 'GLOBAL') {
      // Scoped assignments never become global merely because a caller omitted
      // resource context. Fail closed until the exact resource scope is supplied.
      if (!scope?.type || !scope.id || assignmentScope !== scope.type || ur.scopeId !== scope.id) continue
    }

    const explicitOnly = EXPLICIT_ONLY_PERMISSIONS.has(requiredPermissionCode)
    if (ur.role.name === 'SYSTEM_ADMIN' && !explicitOnly) return true

    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.code === requiredPermissionCode || (rp.permission.code === '*' && !explicitOnly)) {
        return true
      }
    }
  }

  return false
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })
  return userRoles.map((ur) => ur.role.name)
}
