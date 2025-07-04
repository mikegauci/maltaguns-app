import CategoryListings from '@/components/CategoryListings'

export default function ClothingPage() {
  return (
    <CategoryListings
      type="non_firearms"
      category="airsoft"
      subcategory="clothing"
      title="Clothing"
      description="Browse clothing listings from verified sellers"
    />
  )
}
