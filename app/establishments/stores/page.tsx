import { EstablishmentTypeListClient } from '@/components/establishments/EstablishmentTypeListClient'
import { fetchEstablishmentsByTable } from '@/lib/public-establishments-data'

export const revalidate = 30

export default async function StoresPage() {
  const stores = await fetchEstablishmentsByTable('stores')

  return (
    <EstablishmentTypeListClient
      items={stores}
      title="Firearms Stores"
      description="Find licensed firearms dealers and stores across Malta"
      routePrefix="/establishments/stores"
      emptyLabel="No stores listed yet."
      icon="stores"
    />
  )
}
