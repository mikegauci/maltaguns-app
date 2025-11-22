import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import EstablishmentClient from '@/components/EstablishmentClient'
import { fetchEstablishmentBySlug } from '@/app/establishments/server'

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0 // Disable cache

export default async function ServicingPage({
  params,
}: {
  params: { slug: string }
}) {
  // Force cache revalidation
  headers()

  const establishment = await fetchEstablishmentBySlug('servicing', params.slug)

  if (!establishment) {
    notFound()
  }

  return <EstablishmentClient establishment={establishment} type="servicing" />
}
