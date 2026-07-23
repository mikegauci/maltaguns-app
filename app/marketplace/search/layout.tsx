import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Search Marketplace | MaltaGuns',
  description: 'Search firearms and non-firearms listings on MaltaGuns.',
  noIndex: true,
})

export default function MarketplaceSearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
