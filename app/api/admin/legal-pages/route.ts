import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { isValidCustomLegalSlug } from '@/lib/legal-pages'
import { sanitizeBlogHtml } from '@/lib/sanitize-html'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { data, error } = await auth.supabaseAdmin
      .from('legal_pages')
      .select('slug, title, effective_date, last_updated, updated_at')
      .order('slug')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pages: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load legal pages',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const rawContent = typeof body.content === 'string' ? body.content : ''

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!isValidCustomLegalSlug(slug)) {
      return NextResponse.json(
        {
          error:
            'Slug must be lowercase letters, numbers and hyphens, and must not match an existing built-in page',
        },
        { status: 400 }
      )
    }

    const content = sanitizeBlogHtml(rawContent)
    if (content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabaseAdmin
      .from('legal_pages')
      .insert({
        slug,
        title,
        content,
        effective_date: body.effective_date || null,
        last_updated: body.last_updated || null,
      })
      .select('slug, title, effective_date, last_updated, updated_at')
      .single()

    if (error) {
      const status = error.code === '23505' ? 409 : 500
      return NextResponse.json(
        {
          error:
            status === 409
              ? 'A legal page with this slug already exists'
              : error.message,
        },
        { status }
      )
    }

    return NextResponse.json({ page: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create legal page',
      },
      { status: 500 }
    )
  }
}
