import { supabase } from '@/lib/supabase/public'
import { ESTABLISHMENT_CARD_SELECT } from '@/lib/query-selects'

type EstablishmentTable = 'stores' | 'clubs' | 'ranges' | 'servicing'

export async function fetchAllEstablishments() {
  const [storesRes, clubsRes, servicingRes, rangesRes] = await Promise.all([
    supabase
      .from('stores')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active'),
    supabase
      .from('clubs')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active'),
    supabase
      .from('servicing')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active'),
    supabase
      .from('ranges')
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('status', 'active'),
  ])

  const anyError =
    storesRes.error || clubsRes.error || servicingRes.error || rangesRes.error
  if (anyError) throw new Error(anyError.message)

  return [
    ...(storesRes.data || []).map(r => ({ ...r, type: 'stores' as const })),
    ...(clubsRes.data || []).map(r => ({ ...r, type: 'clubs' as const })),
    ...(servicingRes.data || []).map(r => ({
      ...r,
      type: 'servicing' as const,
    })),
    ...(rangesRes.data || []).map(r => ({ ...r, type: 'ranges' as const })),
  ].sort((a, b) => a.business_name.localeCompare(b.business_name))
}

export async function fetchEstablishmentsByTable(table: EstablishmentTable) {
  const { data, error } = await supabase
    .from(table)
    .select(ESTABLISHMENT_CARD_SELECT)
    .eq('status', 'active')
    .order('business_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
