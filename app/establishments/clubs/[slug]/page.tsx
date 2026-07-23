import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import EstablishmentClient from '@/components/EstablishmentClient'
import { fetchEstablishmentBySlug } from '@/app/establishments/server'
import { generateEstablishmentMetadata } from '@/app/establishments/seo'
import { EstablishmentJsonLd } from '@/app/establishments/EstablishmentJsonLd'

export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  return generateEstablishmentMetadata('clubs', params.slug)
}

export default async function ClubPage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  await headers()

  const establishment = await fetchEstablishmentBySlug('clubs', params.slug)

  if (!establishment) {
    notFound()
  }

  return (
    <>
      <EstablishmentJsonLd establishment={establishment} type="clubs" />
      <EstablishmentClient establishment={establishment} type="clubs" />
    </>
  )
}
