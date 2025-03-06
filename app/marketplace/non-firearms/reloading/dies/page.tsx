import CategoryListings from "@/components/CategoryListings"

export default function DiesPage() {
  return (
    <CategoryListings 
      type="non_firearms"
      category="reloading"
      subcategory="dies"
      title="Dies"
      description="Browse dies listings from verified sellers"
    />
  )
}