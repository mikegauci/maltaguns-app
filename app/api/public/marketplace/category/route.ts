import { NextResponse } from 'next/server'
import { fetchCategoryListings } from '@/lib/category-listings-data'
import { PUBLIC_API_CACHE_CONTROL } from '@/lib/query-selects'

export const revalidate = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const category = url.searchParams.get('category') || undefined
  const subcategory = url.searchParams.get('subcategory') || undefined

  if (type && type !== 'firearms' && type !== 'non_firearms') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    const data = await fetchCategoryListings({
      type: type as 'firearms' | 'non_firearms' | undefined,
      category,
      subcategory,
    })

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': PUBLIC_API_CACHE_CONTROL,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load category listings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
