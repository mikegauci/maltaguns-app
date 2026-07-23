import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(
      `
        *,
        author:profiles(username),
        store:stores(id, business_name, slug),
        club:clubs(id, business_name, slug),
        range:ranges(id, business_name, slug),
        servicing:servicing(id, business_name, slug)
      `
    )
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { posts: posts || [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}

