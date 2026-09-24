import { SECTION_SEO_DEFAULTS, type SectionKey } from '@/lib/seo-defaults'

export const LEGAL_PAGE_SEO_KEYS = {
  terms: 'terms',
  privacy: 'privacy',
  'cookie-policy': 'cookies',
  'prohibited-items': 'prohibited_items',
  'refunds-policy': 'refunds',
} as const satisfies Record<string, SectionKey>

export type LegalPageSlug = keyof typeof LEGAL_PAGE_SEO_KEYS

export type LegalPage = {
  slug: LegalPageSlug
  title: string
  content: string
  effective_date: string | null
  last_updated: string | null
  updated_at: string
}

export type LegalPageDefinition = {
  path: string
  seoKey: SectionKey
  subtitle?: string
}

export const LEGAL_PAGE_OPERATOR_SUBTITLE =
  'Maltaguns.com — operated by Matchlock Group Ltd (C 116325)'

const LEGAL_PAGE_SUBTITLES: Partial<Record<LegalPageSlug, string>> = {
  'cookie-policy': LEGAL_PAGE_OPERATOR_SUBTITLE,
  'prohibited-items': LEGAL_PAGE_OPERATOR_SUBTITLE,
  'refunds-policy': LEGAL_PAGE_OPERATOR_SUBTITLE,
}

export const LEGAL_PAGE_SLUGS = Object.keys(
  LEGAL_PAGE_SEO_KEYS
) as LegalPageSlug[]

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return LEGAL_PAGE_SLUGS.includes(value as LegalPageSlug)
}

export function getLegalPageSeoKey(slug: LegalPageSlug): SectionKey {
  return LEGAL_PAGE_SEO_KEYS[slug]
}

export function getLegalPageDefinition(
  slug: LegalPageSlug
): LegalPageDefinition {
  const seoKey = getLegalPageSeoKey(slug)
  return {
    path: SECTION_SEO_DEFAULTS[seoKey].path,
    seoKey,
    subtitle: LEGAL_PAGE_SUBTITLES[slug],
  }
}

export function formatLegalDate(value: string | null): string | null {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}
