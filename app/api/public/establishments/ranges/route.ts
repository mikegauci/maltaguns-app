import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 60

export async function GET() {
  const { data, error } = await supabase
    .from('ranges')
    .select('*')
    .order('business_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { ranges: data || [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  )
}

