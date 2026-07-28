import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/auth'

export async function GET() {
  const user = await getVerifiedUser()

  return NextResponse.json(
    { user },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
