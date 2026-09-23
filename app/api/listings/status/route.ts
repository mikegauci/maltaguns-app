import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  try {
    const { listingId, status } = await request.json()

    if (!listingId || !status) {
      return NextResponse.json(
        { error: 'Missing listingId or status' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this listing' },
        { status: 403 }
      )
    }

    const { error: rpcError } = await supabaseAdmin.rpc(
      'update_listing_status',
      {
        listing_id: listingId,
        new_status: status,
      }
    )

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update listing status',
      },
      { status: 500 }
    )
  }
}
