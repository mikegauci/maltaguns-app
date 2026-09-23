import { cache } from 'react'
import { supabase } from '@/lib/supabase/public'
import type { ListingDetails } from './types'
import { slugify } from '@/lib/format'
import { LISTING_DETAIL_SELECT } from '@/lib/query-selects'

function parseImageUrls(images: string): string[] {
  if (images.startsWith('{') && images.endsWith('}')) {
    return images
      .substring(1, images.length - 1)
      .split(',')
      .map(url => url.trim().replace(/^\"(.*)\"$/, '$1'))
  }
  return images.split(',').map(url => url.trim())
}

export const fetchListingBySlug = cache(
  async (slug: string): Promise<ListingDetails | null> => {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug
      )

    let listingData: any | null = null

    if (isUuid) {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_DETAIL_SELECT)
        .eq('id', slug)
        .single()
      if (error || !data) return null
      listingData = data
    } else {
      const { data: bySlug, error: slugError } = await supabase
        .from('listings')
        .select(LISTING_DETAIL_SELECT)
        .eq('slug', slug)
        .maybeSingle()

      if (!slugError && bySlug) {
        listingData = bySlug
      } else {
        const rough = slug.replace(/-/g, ' ')
        const { data, error } = await supabase
          .from('listings')
          .select(LISTING_DETAIL_SELECT)
          .ilike('title', `%${rough}%`)
          .limit(100)

        if (error || !data) return null

        listingData = data.find((l: any) => slugify(l.title) === slug) ?? null
        if (!listingData) {
          const { data: data2 } = await supabase
            .from('listings')
            .select(LISTING_DETAIL_SELECT)
            .order('created_at', { ascending: false })
            .limit(300)
          listingData =
            (data2 || []).find((l: any) => slugify(l.title) === slug) ?? null
        }

        if (!listingData) return null
      }
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
)
