import { NextResponse } from 'next/server'
import { fetchHomePageData } from '@/lib/public-data'

export const revalidate = 30

export async function GET() {
  try {
    const data = await fetchHomePageData()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=150',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load home data'
    console.error('[HOME API]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
