import type { Metadata } from 'next'
import CategoryListings from '@/components/marketplace/CategoryListings'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('marketplace_non_firearms')
}

export default function NonFirearmsPage() {
  return (
    <CategoryListings
      type="non_firearms"
      title="Non-Firearms"
      description="Browse all non-firearms listings from licensed sellers"
    />
  )
}
