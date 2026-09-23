import { createClient } from '@/lib/supabase/server'

export type WishlistListing = {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  slug?: string
  status: string
  created_at: string
  seller_id: string
  seller: {
    username: string
    is_seller: boolean
  } | null
}

export type WishlistItemRecord = {
  id: string
  created_at: string
  listing_id: string
  listings: WishlistListing
}

export async function fetchUserWishlist(
  userId: string
): Promise<WishlistItemRecord[]> {
  const supabase = await createClient()

  const { data: wishlistItems, error } = await supabase
    .from('wishlist')
    .select(
      `
        id,
        created_at,
        listing_id,
        listings (
          id,
          title,
          description,
          price,
          category,
          subcategory,
          calibre,
          type,
          thumbnail,
          status,
          created_at,
          seller_id,
          slug,
          seller:profiles!seller_id (
            username,
            is_seller
          )
        )
      `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const normalized: WishlistItemRecord[] = []

  for (const item of wishlistItems || []) {
    const listing = Array.isArray(item.listings)
      ? item.listings[0]
      : item.listings
    if (!listing) continue

    const seller = Array.isArray(listing.seller)
      ? listing.seller[0]
      : listing.seller

    normalized.push({
      id: item.id,
      created_at: item.created_at,
      listing_id: item.listing_id,
      listings: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        subcategory: listing.subcategory ?? undefined,
        calibre: listing.calibre ?? undefined,
        type: listing.type,
        thumbnail: listing.thumbnail,
        slug: listing.slug ?? undefined,
        status: listing.status,
        created_at: listing.created_at,
        seller_id: listing.seller_id,
        seller: seller ?? null,
      },
    })
  }

  return normalized
}
