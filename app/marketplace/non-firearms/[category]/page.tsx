'use client'

import { notFound } from 'next/navigation'
import CategoryListings from '@/components/CategoryListings'
import {
  nonFirearmsCategories,
  slugToCategoryKey,
} from '@/app/marketplace/create/constants'

interface NonFirearmsCategoryPageProps {
  params: {
    category: string
  }
}

// Valid non-firearms categories from constants
const VALID_CATEGORIES = Object.keys(nonFirearmsCategories) as Array<
  keyof typeof nonFirearmsCategories
>

export default function NonFirearmsCategoryPage({
  params,
}: NonFirearmsCategoryPageProps) {
  // Convert URL slug to category key (e.g., "some-category" -> "some_category")
  const categorySlug = params.category
  const categoryKey = slugToCategoryKey(categorySlug)

  // Validate category exists - trigger 404 if not valid
  if (!VALID_CATEGORIES.includes(categoryKey as any)) {
    notFound()
  }

  // Get the category label from constants
  const categoryLabel =
    nonFirearmsCategories[categoryKey as keyof typeof nonFirearmsCategories] ||
    categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)

  return (
    <CategoryListings
      type="non_firearms"
      category={categoryKey}
      title={categoryLabel}
      description={`Browse ${categoryLabel.toLowerCase()} from verified sellers`}
    />
  )
}
