import WishlistClient from './wishlist-client'
import { fetchUserWishlist } from '@/lib/wishlist-data'
import { requireUser } from '@/lib/require-auth'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const { user } = await requireUser('/wishlist')

  const initialItems = await fetchUserWishlist(user.id)

  return <WishlistClient userId={user.id} initialItems={initialItems} />
}
