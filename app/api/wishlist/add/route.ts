import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, seller_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot add your own listing to wishlist' },
        { status: 400 }
      )
    }

    const { data: existingWishlistItem } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single()

    if (existingWishlistItem) {
      return NextResponse.json(
        { error: 'Item already in wishlist' },
        { status: 400 }
      )
    }

    const { data: wishlistItem, error: wishlistError } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        listing_id: listingId,
      })
      .select()
      .single()

    if (wishlistError) {
      console.error('Error adding to wishlist:', wishlistError)
      return NextResponse.json(
        { error: 'Failed to add to wishlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Added to wishlist',
      wishlistItem,
    })
  } catch (error) {
    console.error('Error in wishlist add API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
