import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/public'

const ESTABLISHMENT_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

type EstablishmentTable = 'stores' | 'clubs' | 'ranges' | 'servicing'

export async function getActiveEstablishmentsResponse(
  table: EstablishmentTable,
  responseKey: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('status', 'active')
    .order('business_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { [responseKey]: data || [] },
    { headers: ESTABLISHMENT_CACHE_HEADERS }
  )
}
