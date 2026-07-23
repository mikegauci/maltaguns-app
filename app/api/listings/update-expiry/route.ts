import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

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

    if (listing.seller_id !== user.id) {
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
