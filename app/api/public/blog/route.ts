import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/public'
import { BLOG_CARD_SELECT, PUBLIC_API_CACHE_CONTROL } from '@/lib/query-selects'
import { applyExcludeHelpGuideIds } from '@/lib/help-guide-utils'
import { fetchHelpGuidePostIdsPublic } from '@/lib/help-guides.public'

export const revalidate = 30

export async function GET() {
  try {
    const helpGuideIds = await fetchHelpGuidePostIdsPublic()

    const { data: posts, error } = await applyExcludeHelpGuideIds(
      supabase
        .from('blog_posts')
        .select(BLOG_CARD_SELECT)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50),
      helpGuideIds
    )

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
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch blog posts',
      },
      { status: 500 }
    )
  }
}
