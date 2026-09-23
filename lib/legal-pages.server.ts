import { createClient } from '@/lib/supabase/server'
import type { LegalPage, LegalPageSlug } from '@/lib/legal-pages'

export async function getLegalPage(
  slug: LegalPageSlug
): Promise<LegalPage | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('legal_pages')
    .select('slug, title, content, effective_date, last_updated, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch legal page:', slug, error)
    return null
  }

  return data as LegalPage | null
}
