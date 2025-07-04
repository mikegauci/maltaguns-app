import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Create a direct Supabase client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    console.log('Direct API: Starting fetch with service role')

    // Direct fetch all credits with service role
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from('credits')
      .select('*')
      .order('created_at', { ascending: false })

    if (creditsError) {
      console.error('Direct API error:', creditsError)
      return NextResponse.json({ error: creditsError.message }, { status: 500 })
    }

    console.log(`Direct API: Found ${credits?.length || 0} credits`)

    if (!credits || credits.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get unique user IDs
    const userIds = Array.from(
      new Set((credits as Credit[]).map(c => c.user_id))
    )

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Direct API profiles error:', profilesError)
      // Continue with credits only
    }

    // Create profiles map
    const profileMap: ProfileMap = {}
    if (profiles) {
      ;(profiles as Profile[]).forEach(profile => {
        profileMap[profile.id] = profile
      })
    }

    // Combine data
    const data = (credits as Credit[]).map(credit => ({
      ...credit,
      username: profileMap[credit.user_id]?.username || 'Unknown',
      email: profileMap[credit.user_id]?.email || '',
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Direct API exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
