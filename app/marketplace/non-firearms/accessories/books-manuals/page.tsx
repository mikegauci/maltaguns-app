import CategoryListings from '@/components/CategoryListings'

export default function BooksManualsPage() {
  return (
    <CategoryListings
      type="non_firearms"
      category="accessories"
      subcategory="books_manuals"
      title="Books & Manuals"
      description="Browse books & manuals listings from verified sellers"
    />
  )
}
