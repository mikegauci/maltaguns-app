'use client'

import { notFound } from 'next/navigation'
import CategoryListings from '@/components/CategoryListings'
import {
  nonFirearmsCategories,
  nonFirearmsSubcategories,
  slugToCategoryKey,
} from '@/app/marketplace/create/constants'

interface NonFirearmsSubcategoryPageProps {
  params: {
    category: string
    subcategory: string
  }
}

// Valid non-firearms categories from constants
const VALID_CATEGORIES = Object.keys(nonFirearmsCategories) as Array<
  keyof typeof nonFirearmsCategories
>

export default function NonFirearmsSubcategoryPage({
  params,
}: NonFirearmsSubcategoryPageProps) {
  // Convert URL slugs to category keys
  const categorySlug = params.category
  const subcategorySlug = params.subcategory
  const categoryKey = slugToCategoryKey(categorySlug)
  const subcategoryKey = slugToCategoryKey(subcategorySlug)

  // Validate category exists
  if (!VALID_CATEGORIES.includes(categoryKey as any)) {
    notFound()
  }

  // Validate subcategory exists for this category
  const categorySubcategories =
    nonFirearmsSubcategories[
      categoryKey as keyof typeof nonFirearmsSubcategories
    ]

  if (
    !categorySubcategories ||
    !Object.keys(categorySubcategories).includes(subcategoryKey)
  ) {
    notFound()
  }

  // Get the category and subcategory labels from constants
  const categoryLabel =
    nonFirearmsCategories[categoryKey as keyof typeof nonFirearmsCategories]

  const subcategoryLabel =
    categorySubcategories[subcategoryKey as keyof typeof categorySubcategories]

  return (
    <CategoryListings
      type="non_firearms"
      category={categoryKey}
      subcategory={subcategoryKey}
      title={subcategoryLabel}
      description={`Browse ${subcategoryLabel.toLowerCase()} listings from verified sellers`}
    />
  )
}
