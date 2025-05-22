import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Create a direct Supabase client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    
    // Direct fetch all event credits with service role
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
    
    // Get unique user IDs
    const userIds = Array.from(new Set((eventCredits as EventCredit[]).map(c => c.user_id)))
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email')
      .in('id', userIds)
      
    if (profilesError) {
      console.error("Direct API profiles error:", profilesError)
      // Continue with event credits only
    }
    
    // Create profiles map
    const profileMap: ProfileMap = {}
    if (profiles) {
      (profiles as Profile[]).forEach(profile => {
        profileMap[profile.id] = profile
      })
    }
    
    // Combine data
    const data = (eventCredits as EventCredit[]).map(eventCredit => ({
      ...eventCredit,
      username: profileMap[eventCredit.user_id]?.username || 'Unknown',
      email: profileMap[eventCredit.user_id]?.email || ''
    }))
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 