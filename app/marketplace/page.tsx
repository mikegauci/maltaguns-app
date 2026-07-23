import { getMarketplacePageData } from '@/lib/public-data'
import MarketplaceClient from './marketplace-client'

export const revalidate = 30

export default async function Marketplace() {
  const data = await getMarketplacePageData()

  return (
    <MarketplaceClient
      featuredListings={data.featuredListings as any}
      regularListings={data.regularListings as any}
    />
  )
}
