import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const now = new Date().toISOString()

  const [
    recentListingsRes,
    featuredListingsRes,
    postsRes,
    eventsRes,
    storesRes,
    rangesRes,
    servicingRes,
    clubsRes,
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('featured_listings')
      .select(
        `
          listing_id,
          listings!inner(*)
        `
      )
      .gt('end_date', now)
      .eq('listings.status', 'active')
      .gt('listings.expires_at', now)
      .order('end_date', { ascending: false })
      .limit(3),

    supabase
      .from('blog_posts')
      .select(
        `
          *,
          author:profiles(username)
        `
      )
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('events')
      .select('*')
      .gte('start_date', now)
      .order('start_date', { ascending: true })
      .limit(3),

    supabase.from('stores').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('ranges').select('*').order('created_at', { ascending: false }).limit(3),
    supabase
      .from('servicing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('clubs').select('*').order('created_at', { ascending: false }).limit(3),
  ])

  if (recentListingsRes.error) {
    return NextResponse.json(
      { error: recentListingsRes.error.message },
      { status: 500 }
    )
  }

  const featuredListings = (featuredListingsRes.data || []).map((item: any) => ({
    ...(item.listings as any),
    is_featured: true,
  }))

  const establishments: any[] = []
  const pushTyped = (rows: any[] | null, type: string) => {
    ;(rows || []).forEach(r => establishments.push({ ...r, type }))
  }

  pushTyped(storesRes.data as any, 'store')
  pushTyped(rangesRes.data as any, 'range')
  pushTyped(servicingRes.data as any, 'servicing')
  pushTyped(clubsRes.data as any, 'club')

  const featuredEstablishments = establishments
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3)

  return NextResponse.json(
    {
      recentListings: recentListingsRes.data || [],
      featuredListings,
      latestPosts: postsRes.data || [],
      latestEvents: eventsRes.data || [],
      featuredEstablishments,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=150',
      },
    }
  )
}

