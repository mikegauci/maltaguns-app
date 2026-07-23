import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

interface Profile {
  id: string
  username?: string
  email?: string
}

interface Credit {
  id: string
  user_id: string
  amount: string
  created_at: string
  updated_at: string
}

interface ProfileMap {
  [key: string]: Profile
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: credits, error: creditsError } = await supabaseAdmin
      .from('credits')
      .select('*')
      .order('created_at', { ascending: false })

    if (creditsError) {
      return NextResponse.json({ error: creditsError.message }, { status: 500 })
    }

    if (!credits || credits.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const userIds = Array.from(
      new Set((credits as Credit[]).map(c => c.user_id))
    )

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Direct API profiles error:', profilesError)
    }

    const profileMap: ProfileMap = {}
    if (profiles) {
      ;(profiles as Profile[]).forEach(profile => {
        profileMap[profile.id] = profile
      })
    }

    const data = (credits as Credit[]).map(credit => ({
      ...credit,
      username: profileMap[credit.user_id]?.username || 'Unknown',
      email: profileMap[credit.user_id]?.email || '',
    }))

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
