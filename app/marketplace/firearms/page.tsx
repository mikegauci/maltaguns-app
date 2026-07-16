import type { Metadata } from 'next'
import CategoryListings from '@/components/marketplace/CategoryListings'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('marketplace_firearms')
}

export default function FirearmsPage() {
  return (
    <CategoryListings
      type="firearms"
      title="Firearms"
      description="Browse all firearms listings from licensed sellers"
    />
  )
}
