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
    const { listingId } = await request.json()

    if (!listingId) {
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

    console.log(
      '[ADMIN DELETE API] Admin attempting to delete listing:',
      listingId
    )

    // First verify that the listing exists (admin can delete any listing)
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (listingError) {
      console.error('[ADMIN DELETE API] Error finding listing:', listingError)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Begin cascading delete of all related records
    console.log('[ADMIN DELETE API] Beginning cascading delete...')

    // 1. Delete featured_listings entries
    const { error: featuredError } = await supabaseAdmin
      .from('featured_listings')
      .delete()
      .eq('listing_id', listingId)

    if (featuredError) {
      console.error(
        '[ADMIN DELETE API] Error removing from featured listings:',
        featuredError
      )
      // Continue despite this error
    }

    // 2. Delete saved_listings entries
    const { error: savedError } = await supabaseAdmin
      .from('saved_listings')
      .delete()
      .eq('listing_id', listingId)

    if (savedError) {
      console.error(
        '[ADMIN DELETE API] Error removing from saved listings:',
        savedError
      )
      // Continue despite this error
    }

    // 3. Delete listing_reports entries
    const { error: reportsError } = await supabaseAdmin
      .from('report_listings')
      .delete()
      .eq('listing_id', listingId)

    if (reportsError) {
      console.error(
        '[ADMIN DELETE API] Error deleting listing reports:',
        reportsError
      )
      // Continue despite this error
    }

    // 4. Delete messages related to this listing (if applicable)
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('listing_id', listingId)

    if (messagesError) {
      console.error(
        '[ADMIN DELETE API] Error deleting messages:',
        messagesError
      )
      // Continue despite this error
    }

    // 5. Delete the listing itself
    const { error: deleteError } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', listingId)

    if (deleteError) {
      console.error('[ADMIN DELETE API] Error deleting listing:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete listing', details: deleteError },
        { status: 500 }
      )
    }

    console.log('[ADMIN DELETE API] Listing deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
