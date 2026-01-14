import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUserProfile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

    if (profileError || !currentUserProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const qRaw = url.searchParams.get('q') ?? ''
    const q = qRaw.trim()

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
