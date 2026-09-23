import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { isLegalPageSlug } from '@/lib/legal-pages'
import { sanitizeBlogHtml } from '@/lib/sanitize-html'

type UpdateLegalPageBody = {
  title?: string
  content?: string
  effective_date?: string | null
  last_updated?: string | null
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  request: Request,
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

    const body = (await request.json()) as UpdateLegalPageBody
    const title = emptyToNull(body.title)
    const rawContent = body.content

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (typeof rawContent !== 'string' || rawContent.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters' },
        { status: 400 }
      )
    }

    const content = sanitizeBlogHtml(rawContent)

    if (content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters after sanitization' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabaseAdmin
      .from('legal_pages')
      .update({
        title,
        content,
        effective_date: emptyToNull(body.effective_date),
        last_updated: emptyToNull(body.last_updated),
      })
      .eq('slug', slug)
      .select('slug, title, content, effective_date, last_updated, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ page: data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update legal page',
      },
      { status: 500 }
    )
  }
}
