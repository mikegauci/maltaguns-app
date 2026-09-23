import { EstablishmentTypeListClient } from '@/components/establishments/EstablishmentTypeListClient'
import { fetchEstablishmentsByTable } from '@/lib/public-establishments-data'

export const revalidate = 30

export default async function ClubsPage() {
  const clubs = await fetchEstablishmentsByTable('clubs')

  return (
    <EstablishmentTypeListClient
      items={clubs}
      title="Shooting Clubs"
      description="Find shooting clubs and associations across Malta"
      routePrefix="/establishments/clubs"
      emptyLabel="No clubs listed yet."
      icon="clubs"
    />
  )
}
