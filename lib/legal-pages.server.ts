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

const COOKIE_POLICY_CONTACT_HEADING = '<h2>4. Contact</h2>'
const COOKIE_POLICY_GA_FALLBACK = ' We use Google Analytics 4 when configured.'

export function prepareCookiePolicyHtml(html: string): {
  beforeSettings: string
  afterSettings: string
} {
  let content = html
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  if (gaId) {
    content = content.replace(
      COOKIE_POLICY_GA_FALLBACK,
      ` Measurement ID: ${gaId} (Google Analytics 4).`
    )
  }

  const contactIndex = content.indexOf(COOKIE_POLICY_CONTACT_HEADING)
  if (contactIndex === -1) {
    return { beforeSettings: content, afterSettings: '' }
  }

  return {
    beforeSettings: content.slice(0, contactIndex).trimEnd(),
    afterSettings: content.slice(contactIndex),
  }
}
