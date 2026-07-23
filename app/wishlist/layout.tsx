import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Wishlist | MaltaGuns',
  description: 'Your saved MaltaGuns marketplace listings.',
  noIndex: true,
})

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
