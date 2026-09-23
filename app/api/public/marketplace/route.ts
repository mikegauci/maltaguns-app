import { NextResponse } from 'next/server'
import { fetchMarketplacePageData } from '@/lib/public-data'
import { PUBLIC_API_CACHE_CONTROL } from '@/lib/query-selects'

export const revalidate = 30

export async function GET() {
  try {
    const data = await fetchMarketplacePageData()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': PUBLIC_API_CACHE_CONTROL,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load marketplace data'
    console.error('[MARKETPLACE API]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
