import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ListingClient from './listing-client'
import { fetchListingBySlug } from './server'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'

export const revalidate = 30

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const listing = await fetchListingBySlug(params.slug)
  if (!listing) {
    return { title: 'Listing Not Found | MaltaGuns' }
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

export default async function ListingPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params

  const listing = await fetchListingBySlug(slug)

  if (!listing) notFound()

  return <ListingClient listing={listing} />
}
