import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { data, error } = await (supabaseAdmin as any)
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      settings: data || {
        id: 1,
        site_title: 'MaltaGuns - Firearms Community Hub',
        site_description:
          'The premier destination for the firearms community in Malta',
        default_og_image: null,
        twitter_handle: null,
      },
    })
  } catch (error) {
    console.error('[ADMIN SEO SETTINGS GET] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
