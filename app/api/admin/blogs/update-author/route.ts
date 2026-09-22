import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { postId, authorId } = await request.json()

    if (!postId || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', authorId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({
        author_id: authorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update author: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      author: { username: profile.username },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
