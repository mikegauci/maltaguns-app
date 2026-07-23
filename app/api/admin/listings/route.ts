import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: featuredData, error: featuredError } = await supabaseAdmin
      .from('featured_listings')
      .select('listing_id')

    if (featuredError) {
      return NextResponse.json(
        {
          error: `Failed to fetch featured listings: ${featuredError.message}`,
        },
        { status: 500 }
      )
    }

    const featuredListingIds = new Set(
      featuredData?.map(item => item.listing_id) || []
    )

    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        seller:seller_id(username, email)
      `
      )
      .order('created_at', { ascending: false })

    if (listingsError) {
      return NextResponse.json(
        { error: `Failed to fetch listings: ${listingsError.message}` },
        { status: 500 }
      )
    }

    const listingsWithFeaturedStatus =
      listings?.map(listing => ({
        ...listing,
        featured: featuredListingIds.has(listing.id),
      })) || []

    return NextResponse.json({
      success: true,
      listings: listingsWithFeaturedStatus,
    })
  } catch (error) {
    console.error('[ADMIN LISTINGS GET] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
