import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const status = req.nextUrl.searchParams.get('status')

    let query = supabaseAdmin
      .from('armory_dealer_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('account_status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ownerIds = Array.from(new Set((data ?? []).map(d => d.owner_id)))
    const { data: profiles } = ownerIds.length
      ? await supabaseAdmin
          .from('profiles')
          .select('id, email, first_name, last_name, username')
          .in('id', ownerIds)
      : { data: [] }

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const dealers = (data ?? []).map(d => {
      const profile = profileMap.get(d.owner_id)
      return {
        ...d,
        ownerEmail: profile?.email ?? undefined,
        ownerName:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          profile?.username ||
          undefined,
      }
    })

    return NextResponse.json({ dealers })
  } catch (error) {
    console.error('Error fetching armory dealers:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
