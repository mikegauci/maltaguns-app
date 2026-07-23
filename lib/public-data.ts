import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabase } from '@/lib/supabase'

export async function getHomePageData() {
  try {
    return await fetchHomePageData()
  } catch (error) {
    console.error('[getHomePageData]', error)
    return {
      recentListings: [],
      featuredListings: [],
      latestPosts: [],
      latestEvents: [],
      featuredEstablishments: [],
    }
  }
}

async function fetchHomePageData() {
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
    supabaseAdmin
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
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
      .limit(10),
    supabaseAdmin
      .from('blog_posts')
      .select(
        `
          *,
          author:profiles(username)
        `
      )
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('events')
      .select('*')
      .gte('start_date', now)
      .order('start_date', { ascending: true })
      .limit(10),
    supabaseAdmin
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('ranges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('servicing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (recentListingsRes.error) {
    throw new Error(recentListingsRes.error.message)
  }
  if (featuredListingsRes.error) {
    throw new Error(featuredListingsRes.error.message)
  }

  const featuredListings = (featuredListingsRes.data || []).map(
    (item: any) => ({
      ...(item.listings as any),
      is_featured: true,
    })
  )

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
    .slice(0, 10)

  return {
    recentListings: recentListingsRes.data || [],
    featuredListings,
    latestPosts: postsRes.data || [],
    latestEvents: eventsRes.data || [],
    featuredEstablishments,
  }
}

export async function getMarketplacePageData() {
  try {
    return await fetchMarketplacePageData()
  } catch (error) {
    console.error('[getMarketplacePageData]', error)
    return { featuredListings: [], regularListings: [] }
  }
}

async function fetchMarketplacePageData() {
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
    throw new Error(listingsError.message)
  }
  if (featuredRes.error) {
    throw new Error(featuredRes.error.message)
  }

  const featuredSet = new Set((featuredRes.data || []).map(r => r.listing_id))
  const processed = (listingsData || []).map(l => ({
    ...l,
    is_featured: featuredSet.has(l.id),
  }))

  return {
    featuredListings: processed.filter(l => l.is_featured),
    regularListings: processed,
  }
}

export async function getBlogPageData() {
  try {
    return await fetchBlogPageData()
  } catch (error) {
    console.error('[getBlogPageData]', error)
    return { posts: [] }
  }
}

async function fetchBlogPageData() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(
      `
        *,
        author:profiles(username),
        store:stores(id, business_name, slug),
        club:clubs(id, business_name, slug),
        range:ranges(id, business_name, slug),
        servicing:servicing(id, business_name, slug)
      `
    )
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return { posts: posts || [] }
}
