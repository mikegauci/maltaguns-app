import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 5

// Public search endpoint. We keep caching short to avoid exploding cache keys.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const categoryParam = url.searchParams.get('category') || 'all'

  let typeValue: string | null = null
  let categoryValue: string | null = null

  if (categoryParam !== 'all') {
    if (categoryParam === 'firearms' || categoryParam === 'non_firearms') {
      typeValue = categoryParam
    } else if (categoryParam.startsWith('firearms-')) {
      typeValue = 'firearms'
      categoryValue = categoryParam.replace('firearms-', '')
    } else if (categoryParam.startsWith('non_firearms-')) {
      typeValue = 'non_firearms'
      categoryValue = categoryParam.replace('non_firearms-', '')
    }
  }

  let supabaseQuery = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  if (typeValue) supabaseQuery = supabaseQuery.eq('type', typeValue)
  if (categoryValue) supabaseQuery = supabaseQuery.eq('category', categoryValue)

  if (q) {
    const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean)
    const searchConditions = searchTerms
      .map(term => `title.ilike.%${term}%,description.ilike.%${term}%`)
      .join(',')
    supabaseQuery = supabaseQuery.or(searchConditions)
  }

  const [{ data, error }, featuredRes] = await Promise.all([
    supabaseQuery,
    supabase
      .from('featured_listings')
      .select('listing_id')
      .gt('end_date', new Date().toISOString()),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const featuredIds = new Set((featuredRes.data || []).map(r => r.listing_id))
  const featured: any[] = []
  const regular: any[] = []

  ;(data || []).forEach(listing => {
    const withFlag = { ...listing, is_featured: featuredIds.has(listing.id) }
    if (withFlag.is_featured) featured.push(withFlag)
    regular.push(withFlag)
  })

  return NextResponse.json(
    { featuredListings: featured, listings: regular },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
      },
    }
  )
}

