import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

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

    // Create a Supabase client with the cookies for auth
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Remove from wishlist
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
