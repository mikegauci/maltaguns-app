import CategoryListings from '@/components/CategoryListings'

export default function SafetyEquipmentPage() {
  return (
    <CategoryListings
      type="non_firearms"
      category="accessories"
      subcategory="safety_equipment"
      title="Safety Equipment"
      description="Browse safety equipment listings from verified sellers"
    />
  )
}
