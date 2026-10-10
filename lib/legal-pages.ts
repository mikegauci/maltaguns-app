import { SECTION_SEO_DEFAULTS, type SectionKey } from '@/lib/seo-defaults'

export const LEGAL_PAGE_SEO_KEYS = {
  terms: 'terms',
  privacy: 'privacy',
  'cookie-policy': 'cookies',
  'prohibited-items': 'prohibited_items',
  'refunds-policy': 'refunds',
} as const satisfies Record<string, SectionKey>

export type BuiltInLegalPageSlug = keyof typeof LEGAL_PAGE_SEO_KEYS
export type LegalPageSlug = string

export const BUILT_IN_LEGAL_PAGE_SLUGS = Object.keys(
  LEGAL_PAGE_SEO_KEYS
) as BuiltInLegalPageSlug[]

export const CUSTOM_LEGAL_PAGE_BASE_PATH = '/legal'

const RESERVED_LEGAL_SLUGS = new Set(['new'])

export function isBuiltInLegalPageSlug(
  value: string
): value is BuiltInLegalPageSlug {
  return BUILT_IN_LEGAL_PAGE_SLUGS.includes(value as BuiltInLegalPageSlug)
}

export function isValidCustomLegalSlug(value: string): boolean {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 80 &&
    !isBuiltInLegalPageSlug(value) &&
    !RESERVED_LEGAL_SLUGS.has(value)
  )
}

export function slugifyLegalTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function getLegalPagePath(slug: string): string {
  return isBuiltInLegalPageSlug(slug)
    ? SECTION_SEO_DEFAULTS[LEGAL_PAGE_SEO_KEYS[slug]].path
    : `${CUSTOM_LEGAL_PAGE_BASE_PATH}/${slug}`
}

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
  seoKey: SectionKey | null
  subtitle?: string
}

export const LEGAL_PAGE_OPERATOR_SUBTITLE =
  'Maltaguns.com — operated by Matchlock Group Ltd (C 116325)'

const LEGAL_PAGE_SUBTITLES: Partial<Record<BuiltInLegalPageSlug, string>> = {
  'cookie-policy': LEGAL_PAGE_OPERATOR_SUBTITLE,
  'prohibited-items': LEGAL_PAGE_OPERATOR_SUBTITLE,
  'refunds-policy': LEGAL_PAGE_OPERATOR_SUBTITLE,
}

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return isBuiltInLegalPageSlug(value) || isValidCustomLegalSlug(value)
}

export function getLegalPageSeoKey(slug: BuiltInLegalPageSlug): SectionKey {
  return LEGAL_PAGE_SEO_KEYS[slug]
}

export function getLegalPageDefinition(
  slug: LegalPageSlug
): LegalPageDefinition {
  if (!isBuiltInLegalPageSlug(slug)) {
    return { path: getLegalPagePath(slug), seoKey: null }
  }
  return {
    path: getLegalPagePath(slug),
    seoKey: getLegalPageSeoKey(slug),
    subtitle: LEGAL_PAGE_SUBTITLES[slug],
  }
}

export function formatLegalDate(value: string | null): string | null {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}
