/* eslint-disable no-console -- this is a controlled one-time operator command */
import { randomBytes, randomUUID } from 'crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  BUILTIN_ROLES,
  BUILTIN_ROLE_GRANTS,
  LIVE_PERSONA_ACCOUNTS,
  PERMISSION_DEFINITIONS,
} from '../prisma/access-model'

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
})

async function main() {
  const confirmation = process.env.LIVE_ACCOUNT_BOOTSTRAP_CONFIRM
  const resetting = confirmation === 'RESET_ALL_LIVE_ACCOUNTS'
  if (confirmation !== 'CREATE_ALL_LIVE_ACCOUNTS' && !resetting) {
    throw new Error(
      'Set LIVE_ACCOUNT_BOOTSTRAP_CONFIRM=CREATE_ALL_LIVE_ACCOUNTS (or RESET_ALL_LIVE_ACCOUNTS to rotate the demo password)'
    )
  }

  if (!databaseUrl) throw new Error('DATABASE_URL is required')
  const host = new URL(databaseUrl).hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    throw new Error('This command is reserved for the controlled live-account bootstrap')
  }

  const targetEmails = LIVE_PERSONA_ACCOUNTS.map(([email]) => email)
  const existing = await prisma.user.findMany({
    where: { email: { in: targetEmails } },
    select: { id: true, email: true },
  })
  if (existing.length && !resetting) {
    throw new Error(`Refusing to reset existing live accounts: ${existing.map((user) => user.email).join(', ')}`)
  }
  if (resetting && existing.length !== targetEmails.length) {
    throw new Error('RESET_ALL_LIVE_ACCOUNTS requires all nine target accounts to already exist')
  }

  const password = process.env.LIVE_SHARED_PASSWORD || `Frad9-${randomBytes(18).toString('base64url')}`
  if (password.length < 16) throw new Error('LIVE_SHARED_PASSWORD must be at least 16 characters')
  const passwordHash = await bcrypt.hash(password, 12)

  const [existingRoles, existingPermissions] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.permission.findMany({ select: { id: true, code: true } }),
  ])
  const roleIds = new Map(existingRoles.map((role) => [role.name, role.id]))
  const permissionIds = new Map(existingPermissions.map((permission) => [permission.code, permission.id]))
  for (const role of BUILTIN_ROLES) roleIds.set(role.name, roleIds.get(role.name) ?? randomUUID())
  for (const permission of PERMISSION_DEFINITIONS) {
    permissionIds.set(permission.code, permissionIds.get(permission.code) ?? randomUUID())
  }

  const operations: Prisma.PrismaPromise<unknown>[] = []
  for (const role of BUILTIN_ROLES) {
    operations.push(
      prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: { id: roleIds.get(role.name)!, ...role },
      })
    )
  }
  // Course ownership now belongs to HR. Remove the obsolete specialist role
  // only when it has no assignments, so the bootstrap never silently strips
  // access from an existing person.
  operations.push(prisma.role.deleteMany({ where: { name: 'COURSE_ADMIN', userRoles: { none: {} } } }))

  for (const permission of PERMISSION_DEFINITIONS) {
    operations.push(
      prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: { id: permissionIds.get(permission.code)!, ...permission },
      })
    )
  }

  const managedPermissionIds = PERMISSION_DEFINITIONS.map((permission) => permissionIds.get(permission.code)!).filter(
    Boolean
  )
  for (const [roleName, codes] of Object.entries(BUILTIN_ROLE_GRANTS)) {
    const roleId = roleIds.get(roleName)
    if (!roleId) throw new Error(`Role ${roleName} was not resolved`)
    const grantedIds = codes.map((code) => permissionIds.get(code)).filter((id): id is string => Boolean(id))
    operations.push(
      prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: { in: managedPermissionIds.filter((id) => !grantedIds.includes(id)) } },
      }),
      prisma.rolePermission.createMany({
        data: grantedIds.map((permissionId) => ({ id: randomUUID(), roleId, permissionId })),
        skipDuplicates: true,
      })
    )
  }

  const existingUserIds = new Map(existing.map((user) => [user.email, user.id]))
  for (const [email, roleName] of LIVE_PERSONA_ACCOUNTS) {
    const roleId = roleIds.get(roleName)
    if (!roleId) throw new Error(`Role ${roleName} was not resolved`)
    if (resetting) {
      const userId = existingUserIds.get(email)!
      operations.push(
        prisma.user.update({
          where: { id: userId },
          data: { passwordHash, accountStatus: 'ACTIVE', emailVerifiedAt: new Date() },
        }),
        prisma.userRole.deleteMany({ where: { userId } }),
        prisma.userRole.create({
          data: { id: randomUUID(), userId, roleId, scopeType: 'GLOBAL', scopeId: 'GLOBAL' },
        })
      )
    } else {
      operations.push(
        prisma.user.create({
          data: {
            id: randomUUID(),
            email,
            passwordHash,
            accountStatus: 'ACTIVE',
            emailVerifiedAt: new Date(),
            userRoles: {
              create: { id: randomUUID(), roleId, scopeType: 'GLOBAL', scopeId: 'GLOBAL' },
            },
          },
        })
      )
    }
  }

  // One non-interactive database transaction keeps roles, grants, and every
  // requested account all-or-nothing without the hosted transaction timeout.
  await prisma.$transaction(operations)

  console.log(JSON.stringify({ [resetting ? 'reset' : 'created']: targetEmails, sharedPassword: password }, null, 2))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
