import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

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
