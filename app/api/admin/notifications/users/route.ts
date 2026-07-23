import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { sanitizePostgrestSearchTerm } from '@/lib/marketplace-search'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const url = new URL(request.url)
    const q = sanitizePostgrestSearchTerm(url.searchParams.get('q') ?? '')

    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, email, first_name, last_name, is_disabled')
      .order('created_at', { ascending: false })
      .limit(50)

    if (q.length > 0) {
      const like = `%${q}%`
      query = query.or(
        `username.ilike.${like},email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`
      )
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch users: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: data ?? [] }, { status: 200 })
  } catch (error) {
    console.error('[ADMIN NOTIFICATIONS USERS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
