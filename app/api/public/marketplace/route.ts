import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const revalidate = 30

export async function GET() {
  const now = new Date().toISOString()

  const [{ data: listingsData, error: listingsError }, featuredRes] =
    await Promise.all([
      supabaseAdmin
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('featured_listings')
        .select('listing_id')
        .gt('end_date', now),
    ])

  if (listingsError) {
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  if (featuredRes.error) {
    console.error(
      '[MARKETPLACE API] Featured listings query failed:',
      featuredRes.error
    )
    return NextResponse.json(
      { error: featuredRes.error.message },
      { status: 500 }
    )
  }

  const featuredSet = new Set((featuredRes.data || []).map(r => r.listing_id))
  const processed = (listingsData || []).map(l => ({
    ...l,
    is_featured: featuredSet.has(l.id),
  }))

  const featuredListings = processed.filter(l => l.is_featured)
  const regularListings = processed

  return NextResponse.json(
    { featuredListings, regularListings },
    {
      headers: {
        'Cache-Control':
          'public, max-age=0, must-revalidate, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}

