import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/public'
import { BLOG_CARD_SELECT, PUBLIC_API_CACHE_CONTROL } from '@/lib/query-selects'

export const revalidate = 30

export async function GET() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(BLOG_CARD_SELECT)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { posts: posts || [] },
    {
      headers: {
        'Cache-Control': PUBLIC_API_CACHE_CONTROL,
      },
    }
  )
}
