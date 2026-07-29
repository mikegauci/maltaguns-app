import { NextResponse } from 'next/server'
import { fetchMarketplacePageData } from '@/lib/public-data'

export const revalidate = 30

export async function GET() {
  try {
    const data = await fetchMarketplacePageData()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control':
          'public, max-age=0, must-revalidate, s-maxage=10, stale-while-revalidate=50',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load marketplace data'
    console.error('[MARKETPLACE API]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
