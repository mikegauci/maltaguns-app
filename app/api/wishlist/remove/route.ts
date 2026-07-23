import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')

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

    const { error: deleteError } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)

    if (deleteError) {
      console.error('Error removing from wishlist:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove from wishlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    })
  } catch (error) {
    console.error('Error in wishlist remove API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
