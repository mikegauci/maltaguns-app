import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { seedProvisionedAdminPassword } from '@/lib/admin-password-change'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  let body: { userId?: string; password?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const userId = body.userId?.trim()
  const password = body.password?.trim()

  if (!userId || !password) {
    return NextResponse.json(
      { error: 'userId and password are required' },
      { status: 400 }
    )
  }

  const result = await seedProvisionedAdminPassword({ userId, password })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ success: true })
}
