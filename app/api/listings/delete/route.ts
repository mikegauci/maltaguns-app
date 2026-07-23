import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or permission denied' },
        { status: 404 }
      )
    }

    const { error: featuredError } = await supabaseAdmin
      .from('featured_listings')
      .delete()
      .eq('listing_id', listingId)

    if (featuredError) {
      console.error(
        '[DELETE API] Error removing from featured listings:',
        featuredError
      )
    }

    const { error: savedError } = await supabaseAdmin
      .from('saved_listings')
      .delete()
      .eq('listing_id', listingId)

    if (savedError) {
      console.error(
        '[DELETE API] Error removing from saved listings:',
        savedError
      )
    }

    const { error: reportsError } = await supabaseAdmin
      .from('report_listings')
      .delete()
      .eq('listing_id', listingId)

    if (reportsError) {
      console.error(
        '[DELETE API] Error deleting listing reports:',
        reportsError
      )
    }

    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('listing_id', listingId)

    if (messagesError) {
      console.error('[DELETE API] Error deleting messages:', messagesError)
    }

    const { error: deleteError } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('seller_id', user.id)

    if (deleteError) {
      console.error('[DELETE API] Error deleting listing:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete listing', details: deleteError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    })
  } catch (error) {
    console.error('[DELETE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
