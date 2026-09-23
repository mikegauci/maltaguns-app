import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'extend_listing_expiry',
      { listing_id: listingId }
    )

    if (rpcError) {
      return NextResponse.json(
        { error: `Failed to relist: ${rpcError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Listing relisted successfully',
      listing: rpcResult,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    )
  }
}
