import type { QueryClient } from '@tanstack/react-query'

export type WishlistApiItem = {
  id: string
  created_at: string
  listing_id: string
  listings?: unknown
}

export function wishlistQueryKey(userId: string) {
  return ['wishlist', userId] as const
}

export async function fetchWishlistItems(): Promise<WishlistApiItem[]> {
  const response = await fetch('/api/wishlist', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to load wishlist items')
  }
  const data = await response.json()
  return (data.wishlistItems || []) as WishlistApiItem[]
}

export function invalidateWishlist(queryClient: QueryClient, userId: string) {
  void queryClient.invalidateQueries({
    queryKey: wishlistQueryKey(userId),
  })
}

export function setListingWishlistedInCache(
  queryClient: QueryClient,
  userId: string,
  listingId: string,
  wishlisted: boolean
) {
  queryClient.setQueryData<WishlistApiItem[]>(
    wishlistQueryKey(userId),
    (current: WishlistApiItem[] | undefined) => {
      const items = (current ?? []).filter(item => item.listings)
      const exists = items.some(item => item.listing_id === listingId)
      if (wishlisted && !exists) {
        return items
      }
      if (!wishlisted && exists) {
        return items.filter(item => item.listing_id !== listingId)
      }
      return items
    }
  )
}
