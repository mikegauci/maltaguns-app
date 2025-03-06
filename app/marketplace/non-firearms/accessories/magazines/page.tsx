import CategoryListings from "@/components/CategoryListings"

export default function MagazinesPage() {
  return (
    <CategoryListings 
      type="non_firearms"
      category="accessories"
      subcategory="magazines"
      title="Magazines"
      description="Browse magazines listings from verified sellers"
    />
  )
}