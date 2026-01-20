import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Extract listingId from request body
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    // Initialize Supabase client with the user's session
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // First, check if the listing exists and belongs to the user
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, expires_at')
      .eq('id', listingId)
      .single()

    if (listingError) {
      return NextResponse.json(
        { error: `Error fetching listing: ${listingError.message}` },
        { status: 500 }
      )
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Verify the user owns the listing
    if (listing.seller_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this listing' },
        { status: 403 }
      )
    }

    // Relist via RPC (uses SECURITY DEFINER and also locks seller edits)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'extend_listing_expiry',
        { listing_id: listingId }
      )

      if (rpcError) {
        // Continue to fallback method
      } else {
        return NextResponse.json({
          success: true,
          message: 'Listing relisted successfully',
          listing: rpcResult,
        })
      }
    } catch (rpcAttemptError) {
      // Continue to fallback method
    }

    // Fallback: legacy RPC that returns void, then re-fetch listing
    const { error: legacyError } = await supabase.rpc('relist_listing', {
      listing_id: listingId,
    })

    if (legacyError) {
      return NextResponse.json(
        { error: `Failed to relist: ${legacyError.message}` },
        { status: 500 }
      )
    }

    const { data: refreshedListing, error: refreshedError } = await supabase
      .from('listings')
      .select('id, expires_at, status, editable_until, relisted_at')
      .eq('id', listingId)
      .single()

    if (refreshedError || !refreshedListing) {
      return NextResponse.json(
        { error: 'Relisted, but failed to fetch updated listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Listing relisted successfully',
      listing: refreshedListing,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    )
  }
}
