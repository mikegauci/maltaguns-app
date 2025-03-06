import CategoryListings from "@/components/CategoryListings"

export default function UniformsPage() {
  return (
    <CategoryListings 
      type="non_firearms"
      category="militaria"
      subcategory="uniforms"
      title="Uniforms"
      description="Browse uniforms listings from verified sellers"
    />
  )
}