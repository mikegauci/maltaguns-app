import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  try {
    const { postId } = await request.json()

    if (!postId || typeof postId !== 'string') {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    const { data: newCount, error } = await supabaseAdmin.rpc(
      'increment_blog_view_count',
      { post_id: postId }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ count: newCount })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to track blog view',
      },
      { status: 500 }
    )
  }
}
