import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { LISTING_CARD_SELECT } from '@/lib/query-selects'

type CategoryListingsParams = {
  type?: 'firearms' | 'non_firearms'
  category?: string
  subcategory?: string
  limit?: number
}

export async function fetchCategoryListings({
  type,
  category,
  subcategory,
  limit = 100,
}: CategoryListingsParams) {
  const now = new Date()
  const nowIso = now.toISOString()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString()

  let query = supabaseAdmin
    .from('listings')
    .select(LISTING_CARD_SELECT)
    .or(
      `and(status.eq.active,expires_at.gt.${nowIso}),and(status.eq.sold,updated_at.gt.${sevenDaysAgoStr})`
    )

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)
  if (subcategory) query = query.eq('subcategory', subcategory)

  const [{ data, error }, featuredRes] = await Promise.all([
    query.order('created_at', { ascending: false }).limit(limit),
    supabaseAdmin
      .from('featured_listings')
      .select('listing_id')
      .gt('end_date', nowIso),
  ])

  if (error) throw new Error(error.message)
  if (featuredRes.error) throw new Error(featuredRes.error.message)

  const featuredIds = new Set((featuredRes.data || []).map(r => r.listing_id))
  const filtered = (data || []).filter(listing => listing.status !== 'inactive')

  const featured: typeof filtered = []
  const regular: typeof filtered = []

  filtered.forEach(listing => {
    const withFlag = { ...listing, is_featured: featuredIds.has(listing.id) }
    if (withFlag.is_featured) featured.push(withFlag)
    regular.push(withFlag)
  })

  return { featuredListings: featured, regularListings: regular }
}
