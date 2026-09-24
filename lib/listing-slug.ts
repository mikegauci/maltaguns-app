import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/format'

export function listingPublicPath(listing: {
  slug?: string | null
  title: string
  id?: string
}): string {
  const segment = listing.slug || slugify(listing.title) || listing.id || ''
  return `/marketplace/listing/${segment}`
}

export async function resolveUniqueListingSlug(
  supabase: SupabaseClient,
  title: string,
  excludeListingId?: string
): Promise<string> {
  const base = slugify(title) || 'listing'
  let candidate = base
  let suffix = 2

  while (true) {
    let query = supabase
      .from('listings')
      .select('id')
      .eq('slug', candidate)
      .limit(1)
    if (excludeListingId) {
      query = query.neq('id', excludeListingId)
    }
    const { data, error } = await query
    if (error) throw error
    if (!data?.length) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}
