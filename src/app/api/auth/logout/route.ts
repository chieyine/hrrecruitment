import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const user = await getVerifiedUser()
  if (user) await prisma.user.update({ where: { id: user.userId }, data: { sessionVersion: { increment: 1 } } })
  const response = NextResponse.json({ success: true })
  response.cookies.delete('session_token')
  return response
}
