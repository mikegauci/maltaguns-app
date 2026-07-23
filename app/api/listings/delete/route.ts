import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { deleteListingCascade } from '@/lib/listing-delete'
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

    const result = await deleteListingCascade(listingId, {
      sellerId: user.id,
      logPrefix: '[DELETE API]',
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: 'Failed to delete listing', details: result.error },
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
