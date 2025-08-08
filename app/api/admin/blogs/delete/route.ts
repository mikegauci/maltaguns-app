import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: Request) {
  try {
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify admin privileges
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    // Check if the current user is an admin
    const { data: currentUserProfile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

    if (profileError || !currentUserProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    console.log(
      '[ADMIN DELETE API] Admin attempting to delete blog post:',
      postId
    )

    // First verify that the blog post exists
    const { data: blogPost, error: blogPostError } = await supabaseAdmin
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
