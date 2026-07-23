import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data: wishlistItems, error: wishlistError } = await supabase
      .from('wishlist')
      .select(
        `
        id,
        created_at,
        listing_id,
        listings (
          id,
          title,
          description,
          price,
          category,
          subcategory,
          calibre,
          type,
          thumbnail,
          status,
          created_at,
          seller_id,
          seller:profiles!seller_id (
            username,
            is_seller
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (wishlistError) {
      console.error('Error fetching wishlist:', wishlistError)
      return NextResponse.json(
        { error: 'Failed to fetch wishlist' },
        { status: 500 }
      )
    }

    const validWishlistItems =
      wishlistItems?.filter(item => item.listings) || []

    return NextResponse.json({
      success: true,
      wishlistItems: validWishlistItems,
    })
  } catch (error) {
    console.error('Error in wishlist GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
