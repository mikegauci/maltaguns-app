import { EstablishmentTypeListClient } from '@/components/establishments/EstablishmentTypeListClient'
import { fetchEstablishmentsByTable } from '@/lib/public-establishments-data'

export const revalidate = 30

export default async function RangesPage() {
  const ranges = await fetchEstablishmentsByTable('ranges')

  return (
    <EstablishmentTypeListClient
      items={ranges}
      title="Shooting Ranges"
      description="Discover shooting ranges and practice facilities across Malta"
      routePrefix="/establishments/ranges"
      emptyLabel="No ranges listed yet."
      icon="ranges"
    />
  )
}
