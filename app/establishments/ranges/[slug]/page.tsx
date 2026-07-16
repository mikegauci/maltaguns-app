import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import EstablishmentClient from '@/components/EstablishmentClient'
import { fetchEstablishmentBySlug } from '@/app/establishments/server'
import { generateEstablishmentMetadata } from '@/app/establishments/seo'

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0 // Disable cache

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  return generateEstablishmentMetadata('ranges', params.slug)
}

export default async function RangePage({
  params,
}: {
  params: { slug: string }
}) {
  // Force cache revalidation
  headers()

  const establishment = await fetchEstablishmentBySlug('ranges', params.slug)

  if (!establishment) {
    notFound()
  }

  return <EstablishmentClient establishment={establishment} type="ranges" />
}
