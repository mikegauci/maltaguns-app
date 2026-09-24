import { supabase } from '@/lib/supabase/public'
import { EVENT_CARD_SELECT } from '@/lib/query-selects'

export async function fetchPublicEventsBase() {
  const today = new Date().toISOString().split('T')[0]

  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_CARD_SELECT)
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(10),
    supabase
      .from('events')
      .select(EVENT_CARD_SELECT)
      .lt('start_date', today)
      .order('start_date', { ascending: false })
      .limit(6),
  ])

  if (upcomingRes.error) throw new Error(upcomingRes.error.message)
  if (pastRes.error) throw new Error(pastRes.error.message)

  return {
    upcomingEvents: upcomingRes.data || [],
    pastEvents: pastRes.data || [],
  }
}

export async function fetchPublicEventsForMonth(month: string) {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const m = Number(monthStr)

  if (Number.isNaN(year) || Number.isNaN(m) || m < 1 || m > 12) {
    return { calendarEvents: [] }
  }

  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 0)

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_CARD_SELECT)
    .gte('start_date', start.toISOString())
    .lte('start_date', end.toISOString())

  if (error) throw new Error(error.message)

  return { calendarEvents: data || [] }
}
