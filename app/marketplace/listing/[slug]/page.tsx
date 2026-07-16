import { notFound } from 'next/navigation'
import ListingClient from './listing-client'
import { fetchListingBySlug } from './server'

export const revalidate = 30

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
