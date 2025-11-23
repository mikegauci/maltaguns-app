import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify admin privileges
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    // Check if the current user is an admin
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

    console.log('[ADMIN DELETE API] Admin attempting to delete event:', eventId)

    // First verify that the event exists (admin can delete any event)
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('[ADMIN DELETE API] Error finding event:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    console.log('[ADMIN DELETE API] Beginning event deletion...')

    // Delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('[ADMIN DELETE API] Error deleting event:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete event', details: deleteError },
        { status: 500 }
      )
    }

    console.log('[ADMIN DELETE API] Event deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
