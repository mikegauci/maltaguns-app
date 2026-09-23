import { EstablishmentTypeListClient } from '@/components/establishments/EstablishmentTypeListClient'
import { fetchEstablishmentsByTable } from '@/lib/public-establishments-data'

export const revalidate = 30

export default async function ServicingPage() {
  const servicing = await fetchEstablishmentsByTable('servicing')

  return (
    <EstablishmentTypeListClient
      items={servicing}
      title="Firearms Servicing"
      description="Find firearms repair and servicing centers across Malta"
      routePrefix="/establishments/servicing"
      emptyLabel="No servicing centers listed yet."
      icon="servicing"
    />
  )
}
