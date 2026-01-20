import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import ListingClient from './listing-client'

interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  seller_id: string
  created_at: string
  editable_until: string | null
}

interface ListingDetails extends Listing {
  seller: {
    username: string
    email: string | null
    phone: string | null
    contact_preference?: 'email' | 'phone' | 'both'
  } | null
  images: string[]
  status: string
}

export const revalidate = 30

export default async function ListingPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const url = new URL(
    `/api/public/marketplace/listing/${encodeURIComponent(slug)}`,
    `${proto}://${host ?? 'localhost:3000'}`
  )

  const res = await fetch(url, { next: { revalidate } })

  if (!res.ok) notFound()
  const json = await res.json()
  const listing = json.listing as ListingDetails

  return <ListingClient listing={listing} />
}
