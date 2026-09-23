import { notFound } from 'next/navigation'
import {
  firearmsCategories,
  slugToCategoryKey,
} from '@/app/marketplace/create/constants'
import { fetchCategoryListings } from '@/lib/category-listings-data'
import FirearmsCategoryClient from './firearms-category-client'

export const revalidate = 30

const VALID_CATEGORIES = Object.keys(firearmsCategories) as Array<
  keyof typeof firearmsCategories
>

export default async function FirearmsCategoryPage(props: {
  params: Promise<{ category: string }>
}) {
  const params = await props.params
  const categorySlug = params.category
  const categoryKey = slugToCategoryKey(categorySlug)

  if (
    !VALID_CATEGORIES.includes(categoryKey as keyof typeof firearmsCategories)
  ) {
    notFound()
  }

  const { featuredListings, regularListings } = await fetchCategoryListings({
    type: 'firearms',
    category: categoryKey,
  })

  return (
    <FirearmsCategoryClient
      categoryKey={categoryKey as keyof typeof firearmsCategories}
      categorySlug={categorySlug}
      initialFeaturedListings={featuredListings as any}
      initialRegularListings={regularListings as any}
    />
  )
}
