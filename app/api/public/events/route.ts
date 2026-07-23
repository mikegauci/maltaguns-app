import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const month = url.searchParams.get('month') // YYYY-MM

  const today = new Date().toISOString().split('T')[0]

  const upcomingPromise = supabase
    .from('events')
    .select('*')
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(10)

  const pastPromise = supabase
    .from('events')
    .select('*')
    .lt('start_date', today)
    .order('start_date', { ascending: false })
    .limit(6)

  // Supabase query builders are "thenable" but not typed as native Promises.
  // Use `any` here to keep Promise.all ergonomic.
  let calendarPromise: any = Promise.resolve({ data: [], error: null })

  if (month) {
    const [yearStr, monthStr] = month.split('-')
    const year = Number(yearStr)
    const m = Number(monthStr)
    if (!Number.isNaN(year) && !Number.isNaN(m) && m >= 1 && m <= 12) {
      const start = new Date(year, m - 1, 1)
      const end = new Date(year, m, 0)
      calendarPromise = supabase
        .from('events')
        .select('*')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
    }
  }

  const [upcomingRes, pastRes, calendarRes] = await Promise.all([
    upcomingPromise,
    pastPromise,
    calendarPromise,
  ])

  const anyError = upcomingRes.error || pastRes.error || calendarRes.error
  if (anyError) {
    return NextResponse.json({ error: anyError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      upcomingEvents: upcomingRes.data || [],
      pastEvents: pastRes.data || [],
      calendarEvents: calendarRes.data || [],
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
      },
    }
  )
}

