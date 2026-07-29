import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { searchAdminUsers } from '@/lib/admin-user-search'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''

    const { users, error } = await searchAdminUsers(q)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch users: ${error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('[ADMIN NOTIFICATIONS USERS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
