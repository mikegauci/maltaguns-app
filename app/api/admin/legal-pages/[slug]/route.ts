import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { isLegalPageSlug } from '@/lib/legal-pages'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { slug } = await context.params

    if (!isLegalPageSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid legal page slug' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabaseAdmin
      .from('legal_pages')
      .select('slug, title, content, effective_date, last_updated, updated_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Legal page not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ page: data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load legal page',
      },
      { status: 500 }
    )
  }
}
