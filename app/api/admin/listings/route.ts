import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // Verify admin privileges using the current session
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUserProfile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

    if (profileError || !currentUserProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    // Fetch featured listing IDs
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

    // Fetch all listings with seller info (service role bypasses RLS)
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
