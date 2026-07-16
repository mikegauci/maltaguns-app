import { supabase } from '@/lib/supabase'
import type { ListingDetails } from './types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function parseImageUrls(images: string): string[] {
  if (images.startsWith('{') && images.endsWith('}')) {
    return images
      .substring(1, images.length - 1)
      .split(',')
      .map(url => url.trim().replace(/^\"(.*)\"$/, '$1'))
  }
  return images.split(',').map(url => url.trim())
}

const LISTING_SELECT = `
  *,
  seller:profiles(username, email, phone, contact_preference)
`

/**
 * Fetch a marketplace listing by its id (uuid) or slugified title.
 * Shared by the public API route and the listing detail page, so the
 * page never has to self-fetch its own API over HTTP.
 */
export async function fetchListingBySlug(
  slug: string
): Promise<ListingDetails | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug
    )

  let listingData: any | null = null

  if (isUuid) {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('id', slug)
      .single()
    if (error || !data) return null
    listingData = data
  } else {
    // Avoid fetching ALL listings. Use a rough title filter and then match slugify in-memory.
    const rough = slug.replace(/-/g, ' ')
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .ilike('title', `%${rough}%`)
      .limit(100)

    if (error || !data) return null

    listingData = data.find((l: any) => slugify(l.title) === slug) ?? null
    if (!listingData) {
      // As a fallback, try a wider fetch (still capped) and match.
      const { data: data2 } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .order('created_at', { ascending: false })
        .limit(300)
      listingData =
        (data2 || []).find((l: any) => slugify(l.title) === slug) ?? null
    }

    if (!listingData) return null
  }

  let processedImages: string[] = []
  if (typeof listingData.images === 'string') {
    try {
      processedImages = JSON.parse(listingData.images)
    } catch {
      processedImages = parseImageUrls(listingData.images)
    }
  } else if (Array.isArray(listingData.images)) {
    processedImages = listingData.images
  }

  return { ...listingData, images: processedImages } as ListingDetails
}
