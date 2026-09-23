import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/public'
import { ESTABLISHMENT_CARD_SELECT, PUBLIC_API_CACHE_CONTROL } from '@/lib/query-selects'

export const revalidate = 30

export async function GET() {
  const [storesRes, clubsRes, servicingRes, rangesRes] = await Promise.all([
    supabase.from('stores').select(ESTABLISHMENT_CARD_SELECT).eq('status', 'active'),
    supabase.from('clubs').select(ESTABLISHMENT_CARD_SELECT).eq('status', 'active'),
    supabase.from('servicing').select(ESTABLISHMENT_CARD_SELECT).eq('status', 'active'),
    supabase.from('ranges').select(ESTABLISHMENT_CARD_SELECT).eq('status', 'active'),
  ])

  const anyError =
    storesRes.error || clubsRes.error || servicingRes.error || rangesRes.error
  if (anyError) {
    return NextResponse.json({ error: anyError.message }, { status: 500 })
  }

  const all = [
    ...(storesRes.data || []).map(r => ({ ...r, type: 'stores' as const })),
    ...(clubsRes.data || []).map(r => ({ ...r, type: 'clubs' as const })),
    ...(servicingRes.data || []).map(r => ({ ...r, type: 'servicing' as const })),
    ...(rangesRes.data || []).map(r => ({ ...r, type: 'range' as const })),
  ].sort((a, b) => a.business_name.localeCompare(b.business_name))

  return NextResponse.json(
    { establishments: all },
    {
      headers: {
        'Cache-Control': PUBLIC_API_CACHE_CONTROL,
      },
    }
  )
}

