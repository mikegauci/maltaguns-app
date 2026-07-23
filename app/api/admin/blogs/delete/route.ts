import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    console.log(
      '[ADMIN DELETE API] Admin attempting to delete blog post:',
      postId
    )

    // First verify that the blog post exists
    const { error: blogPostError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (blogPostError) {
      console.error(
        '[ADMIN DELETE API] Error finding blog post:',
        blogPostError
      )
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    console.log('[ADMIN DELETE API] Beginning blog post deletion...')

    // Delete the blog post (admin can delete any blog post)
    const { error: deleteError } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('[ADMIN DELETE API] Error deleting blog post:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete blog post: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('[ADMIN DELETE API] Blog post deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE API] Unexpected error:', error)
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
