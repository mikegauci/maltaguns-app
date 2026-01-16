import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const now = new Date().toISOString()

  const [{ data: listingsData, error: listingsError }, featuredRes] =
    await Promise.all([
      supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('featured_listings').select('listing_id').gt('end_date', now),
    ])

  if (listingsError) {
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  const featuredSet = new Set((featuredRes.data || []).map(r => r.listing_id))
  const processed = (listingsData || []).map(l => ({
    ...l,
    is_featured: featuredSet.has(l.id),
  }))

  const featuredListings = processed.filter(l => l.is_featured)
  const regularListings = processed.filter(l => !l.is_featured)

  return NextResponse.json(
    { featuredListings, regularListings },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}

