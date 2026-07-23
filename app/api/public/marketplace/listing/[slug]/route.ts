import { NextResponse } from 'next/server'
import { fetchListingBySlug } from '@/app/marketplace/listing/[slug]/server'

export const revalidate = 30

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  const listing = await fetchListingBySlug(slug)

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(
    { listing },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}
