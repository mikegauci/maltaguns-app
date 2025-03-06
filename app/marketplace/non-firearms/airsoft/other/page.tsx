import CategoryListings from "@/components/CategoryListings"

export default function OtherPage() {
  return (
    <CategoryListings 
      type="non_firearms"
      category="airsoft"
      subcategory="other"
      title="Other"
      description="Browse other listings from verified sellers"
    />
  )
}