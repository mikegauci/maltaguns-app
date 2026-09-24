import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabase } from '@/lib/supabase/public'
import {
  BLOG_CARD_SELECT,
  BLOG_HOME_SELECT,
  ESTABLISHMENT_CARD_SELECT,
  EVENT_HOME_SELECT,
  LISTING_CARD_SELECT,
} from '@/lib/query-selects'
import {
  applyExcludeHelpGuideIds,
  fetchHelpGuidePostIdsPublic,
} from '@/lib/help-guides'

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
      eventsArePast: false,
      featuredEstablishments: [],
    }
  }
}

export async function fetchHomePageData() {
  const now = new Date().toISOString()
  const helpGuideIds = await fetchHelpGuidePostIdsPublic()

  const [
    recentListingsRes,
    featuredListingsRes,
    postsRes,
    upcomingEventsRes,
    pastEventsRes,
    storesRes,
    rangesRes,
    servicingRes,
    clubsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select(LISTING_CARD_SELECT)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('featured_listings')
      .select(
        `
          listing_id,
          listings!inner(${LISTING_CARD_SELECT})
        `
      )
      .gt('end_date', now)
      .eq('listings.status', 'active')
      .gt('listings.expires_at', now)
      .order('end_date', { ascending: false })
      .limit(10),
    applyExcludeHelpGuideIds(
      supabaseAdmin
        .from('blog_posts')
        .select(BLOG_HOME_SELECT)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10),
      helpGuideIds
    ),
    supabaseAdmin
      .from('events')
      .select(EVENT_HOME_SELECT)
      .gte('start_date', now)
      .order('start_date', { ascending: true })
      .limit(10),
    supabaseAdmin
      .from('events')
      .select(EVENT_HOME_SELECT)
      .lt('start_date', now)
      .order('start_date', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('stores')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('ranges')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('servicing')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('clubs')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (recentListingsRes.error) {
    throw new Error(recentListingsRes.error.message)
  }
  if (featuredListingsRes.error) {
    throw new Error(featuredListingsRes.error.message)
  }
  if (postsRes.error) {
    throw new Error(postsRes.error.message)
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

  const upcomingEvents = upcomingEventsRes.data || []
  const pastEvents = pastEventsRes.data || []
  const latestEvents = upcomingEvents.length > 0 ? upcomingEvents : pastEvents

  const latestPosts = (postsRes.data || []).map((post: any) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
  }))

  return {
    recentListings: recentListingsRes.data || [],
    featuredListings,
    latestPosts,
    latestEvents,
    eventsArePast: upcomingEvents.length === 0 && pastEvents.length > 0,
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

export async function fetchMarketplacePageData() {
  const now = new Date().toISOString()

  const [{ data: listingsData, error: listingsError }, featuredRes] =
    await Promise.all([
      supabaseAdmin
        .from('listings')
        .select(LISTING_CARD_SELECT)
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

export async function fetchBlogPageData() {
  const helpGuideIds = await fetchHelpGuidePostIdsPublic()

  const { data: posts, error } = await applyExcludeHelpGuideIds(
    supabase
      .from('blog_posts')
      .select(BLOG_CARD_SELECT)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(50),
    helpGuideIds
  )

  if (error) {
    throw new Error(error.message)
  }

  return { posts: posts || [] }
}
