import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import EstablishmentClient from '@/components/EstablishmentClient'
import { fetchEstablishmentBySlug } from '@/app/establishments/server'
import { generateEstablishmentMetadata } from '@/app/establishments/seo'
import { EstablishmentJsonLd } from '@/app/establishments/EstablishmentJsonLd'

export const revalidate = 30

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  return generateEstablishmentMetadata('stores', params.slug)
}

export default async function StorePage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params

  const establishment = await fetchEstablishmentBySlug('stores', params.slug)

  if (!establishment) {
    notFound()
  }

  return (
    <>
      <EstablishmentJsonLd establishment={establishment} type="stores" />
      <EstablishmentClient establishment={establishment} type="stores" />
    </>
  )
}
