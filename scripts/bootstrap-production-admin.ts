/* eslint-disable no-console -- this module is the intended console sink */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address')
  }
  if (
    !password ||
    password.length < 16 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must be 16-72 UTF-8 bytes and contain upper-case, lower-case, and numeric characters'
    )
  }

  const existingAdmin = await prisma.userRole.findFirst({
    where: { scopeType: 'GLOBAL', scopeId: 'GLOBAL', role: { name: 'SYSTEM_ADMIN' } },
    select: { id: true },
  })
  if (existingAdmin) {
    throw new Error('A global system administrator already exists; bootstrap is intentionally one-time')
  }

  await prisma.$transaction(async (tx) => {
    const role = await tx.role.upsert({
      where: { name: 'SYSTEM_ADMIN' },
      update: { description: 'System administrator' },
      create: { name: 'SYSTEM_ADMIN', description: 'System administrator' },
    })
    const permission = await tx.permission.upsert({
      where: { code: '*' },
      update: { description: 'All platform permissions' },
      create: { code: '*', description: 'All platform permissions' },
    })
    await tx.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    })
    const user = await tx.user.upsert({
      where: { email },
      update: {
        passwordHash: await bcrypt.hash(password, 12),
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    })
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        scopeType: 'GLOBAL',
        scopeId: 'GLOBAL',
      },
    })
  })

  console.log(`Production administrator bootstrapped for ${email}. Clear BOOTSTRAP_ADMIN_PASSWORD now.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
