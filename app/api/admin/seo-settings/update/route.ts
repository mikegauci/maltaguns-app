import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  SECTION_SEO_DEFAULTS,
  type PageSeoMap,
  type SectionKey,
} from '@/lib/seo-defaults'

type UpdateSeoSettingsBody = {
  site_title?: string | null
  site_description?: string | null
  default_og_image?: string | null
  twitter_handle?: string | null
  page_seo?: PageSeoMap | null
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePageSeo(input: PageSeoMap | null | undefined): PageSeoMap {
  const result: PageSeoMap = {}
  if (!input || typeof input !== 'object') return result

  for (const key of Object.keys(SECTION_SEO_DEFAULTS) as SectionKey[]) {
    const entry = input[key]
    if (!entry) continue
    const title = emptyToNull(entry.title)
    const description = emptyToNull(entry.description)
    if (title || description) {
      result[key] = { title, description }
    }
  }

  return result
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const body = (await request.json()) as UpdateSeoSettingsBody
    const pageSeo = normalizePageSeo(body.page_seo)

    const updatePayload = {
      id: 1,
      site_title: emptyToNull(body.site_title),
      site_description: emptyToNull(body.site_description),
      default_og_image: emptyToNull(body.default_og_image),
      twitter_handle:
        emptyToNull(body.twitter_handle)?.replace(/^@/, '') || null,
      page_seo: pageSeo,
      marketplace_meta_title: pageSeo.marketplace?.title || null,
      marketplace_meta_description: pageSeo.marketplace?.description || null,
      events_meta_title: pageSeo.events?.title || null,
      events_meta_description: pageSeo.events?.description || null,
      blog_meta_title: pageSeo.blog?.title || null,
      blog_meta_description: pageSeo.blog?.description || null,
      establishments_meta_title: pageSeo.establishments?.title || null,
      establishments_meta_description:
        pageSeo.establishments?.description || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('site_settings')
      .upsert(updatePayload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: data })
  } catch (error) {
    console.error('[ADMIN SEO SETTINGS UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
