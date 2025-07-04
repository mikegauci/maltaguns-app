import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('[API] Starting update-expiry endpoint request')

  try {
    // Extract listingId from request body
    const { listingId } = await request.json()

    if (!listingId) {
      console.error('[API] No listingId provided')
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    console.log(`[API] Attempting to update expiry for listing: ${listingId}`)

    // Initialize Supabase client with the user's session
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      console.error('[API] No authenticated session found')
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
      console.error(`[API] Error fetching listing: ${listingError.message}`)
      return NextResponse.json(
        { error: `Error fetching listing: ${listingError.message}` },
        { status: 500 }
      )
    }

    if (!listing) {
      console.error(`[API] Listing not found: ${listingId}`)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Verify the user owns the listing
    if (listing.seller_id !== session.user.id) {
      console.error(
        `[API] User ${session.user.id} does not own listing ${listingId}`
      )
      return NextResponse.json(
        { error: 'You do not have permission to update this listing' },
        { status: 403 }
      )
    }

    console.log(`[API] Current expires_at: ${listing.expires_at}`)

    // Calculate new expiry date (30 days from now)
    const newExpiryDate = new Date()
    newExpiryDate.setDate(newExpiryDate.getDate() + 30)
    const newExpiryIso = newExpiryDate.toISOString()

    console.log(`[API] New expires_at will be: ${newExpiryIso}`)

    // First try to update via RPC function (which can use SECURITY DEFINER)
    try {
      console.log('[API] Attempting to update via extend_listing_expiry RPC')
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'extend_listing_expiry',
        { listing_id: listingId }
      )

      if (rpcError) {
        console.error(`[API] RPC method failed: ${rpcError.message}`)
        // Continue to fallback method
      } else {
        console.log('[API] RPC method succeeded:', rpcResult)
        return NextResponse.json({
          success: true,
          message: 'Listing expiry updated successfully via RPC',
          newExpiryDate: rpcResult,
        })
      }
    } catch (rpcAttemptError) {
      console.error('[API] Error during RPC attempt:', rpcAttemptError)
      // Continue to fallback method
    }

    // Fallback: Direct update (may fail if RLS policies are in effect)
    console.log('[API] Attempting direct update fallback')
    const { data: updateData, error: updateError } = await supabase
      .from('listings')
      .update({
        expires_at: newExpiryIso,
      })
      .eq('id', listingId)
      .select('id, expires_at')

    if (updateError) {
      console.error(`[API] Error updating expiry: ${updateError.message}`)
      return NextResponse.json(
        { error: `Failed to update expiry: ${updateError.message}` },
        { status: 500 }
      )
    }

    if (!updateData || updateData.length === 0) {
      console.error(`[API] No rows updated`)
      return NextResponse.json({ error: 'No rows updated' }, { status: 500 })
    }

    console.log(
      `[API] Successfully updated expires_at for listing ${listingId}`
    )

    return NextResponse.json({
      success: true,
      message: 'Listing expiry updated successfully',
      listing: updateData[0],
    })
  } catch (error: any) {
    console.error(`[API] Unexpected error: ${error.message}`)
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    )
  }
}
