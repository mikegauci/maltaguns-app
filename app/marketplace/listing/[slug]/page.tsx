import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ListingClient from './listing-client'
import { fetchListingBySlug } from './server'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildBreadcrumbList, buildProductSchema } from '@/lib/seo-jsonld'

export const revalidate = 30

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const listing = await fetchListingBySlug(params.slug)
  if (!listing) {
    return buildMetadata({
      title: 'Listing Not Found | MaltaGuns',
      noIndex: true,
    })
  }

  const siteSettings = await getSiteSettings()
  return buildMetadata({
    title: listing.meta_title || `${listing.title} | MaltaGuns`,
    description:
      listing.meta_description ||
      truncateDescription(listing.description) ||
      undefined,
    image: listing.thumbnail || listing.images?.[0] || undefined,
    path: `/marketplace/listing/${params.slug}`,
    siteSettings,
  })
}

export default async function ListingPage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  const { slug } = params

  const listing = await fetchListingBySlug(slug)

  if (!listing) notFound()

  const path = `/marketplace/listing/${slug}`

  return (
    <>
      <JsonLd
        data={[
          buildProductSchema({
            name: listing.title,
            description: listing.description,
            image: listing.thumbnail || listing.images?.[0] || null,
            price: listing.price,
            path,
            availability:
              listing.status === 'active' ? 'InStock' : 'OutOfStock',
          }),
          buildBreadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Marketplace', path: '/marketplace' },
            { name: listing.title, path },
          ]),
        ]}
      />
      <ListingClient listing={listing} />
    </>
  )
}
