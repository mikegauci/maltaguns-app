import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

interface Profile {
  id: string
  username?: string
  email?: string
}

interface EventCredit {
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

    const { data: eventCredits, error: eventCreditsError } = await supabaseAdmin
      .from('credits_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (eventCreditsError) {
      return NextResponse.json(
        { error: eventCreditsError.message },
        { status: 500 }
      )
    }

    if (!eventCredits || eventCredits.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const userIds = Array.from(
      new Set((eventCredits as EventCredit[]).map(c => c.user_id))
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

    const data = (eventCredits as EventCredit[]).map(eventCredit => ({
      ...eventCredit,
      username: profileMap[eventCredit.user_id]?.username || 'Unknown',
      email: profileMap[eventCredit.user_id]?.email || '',
    }))

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
