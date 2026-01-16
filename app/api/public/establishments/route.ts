import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const [storesRes, clubsRes, servicingRes, rangesRes] = await Promise.all([
    supabase.from('stores').select('*'),
    supabase.from('clubs').select('*'),
    supabase.from('servicing').select('*'),
    supabase.from('ranges').select('*'),
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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    }
  )
}

