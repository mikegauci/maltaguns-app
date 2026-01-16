import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function parseImageUrls(images: string): string[] {
  if (images.startsWith('{') && images.endsWith('}')) {
    return images
      .substring(1, images.length - 1)
      .split(',')
      .map(url => url.trim().replace(/^\"(.*)\"$/, '$1'))
  }
  return images.split(',').map(url => url.trim())
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug
    )

  const select = `
    *,
    seller:profiles(username, email, phone, contact_preference)
  `

  let listingData: any | null = null

  if (isUuid) {
    const { data, error } = await supabase
      .from('listings')
      .select(select)
      .eq('id', slug)
      .single()
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    listingData = data
  } else {
    // Avoid fetching ALL listings. Use a rough title filter and then match slugify in-memory.
    const rough = slug.replace(/-/g, ' ')
    const { data, error } = await supabase
      .from('listings')
      .select(select)
      .ilike('title', `%${rough}%`)
      .limit(100)

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    listingData = data.find((l: any) => slugify(l.title) === slug) ?? null
    if (!listingData) {
      // As a fallback, try a wider fetch (still capped) and match.
      const { data: data2 } = await supabase
        .from('listings')
        .select(select)
        .order('created_at', { ascending: false })
        .limit(300)
      listingData = (data2 || []).find((l: any) => slugify(l.title) === slug) ?? null
    }

    if (!listingData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  let processedImages: string[] = []
  if (typeof listingData.images === 'string') {
    try {
      processedImages = JSON.parse(listingData.images)
    } catch {
      processedImages = parseImageUrls(listingData.images)
    }
  } else if (Array.isArray(listingData.images)) {
    processedImages = listingData.images
  }

  return NextResponse.json(
    { listing: { ...listingData, images: processedImages } },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}

