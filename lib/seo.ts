import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import {
  SECTION_SEO_DEFAULTS,
  type PageSeoMap,
  type SectionKey,
} from '@/lib/seo-defaults'

export type { SectionKey, PageSeoMap }
export { SECTION_SEO_DEFAULTS }

export type SiteSettings = {
  id: number
  site_title: string | null
  site_description: string | null
  default_og_image: string | null
  twitter_handle: string | null
  page_seo: PageSeoMap | null
  // Legacy columns (kept for backward compatibility; prefer page_seo)
  marketplace_meta_title?: string | null
  marketplace_meta_description?: string | null
  events_meta_title?: string | null
  events_meta_description?: string | null
  blog_meta_title?: string | null
  blog_meta_description?: string | null
  establishments_meta_title?: string | null
  establishments_meta_description?: string | null
  updated_at: string | null
}

const FALLBACK_TITLE = 'MaltaGuns - Firearms Community Hub'
const FALLBACK_DESCRIPTION =
  'The premier destination for the firearms community in Malta'

const LEGACY_SECTION_KEYS = [
  'marketplace',
  'events',
  'blog',
  'establishments',
] as const

/**
 * Canonical public site URL for SEO (sitemap, robots, metadataBase, canonicals).
 * Ignores localhost / vercel.app so production SEO never points at preview hosts.
 */
export function getAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map(value => value.replace(/\/$/, ''))

  for (const url of candidates) {
    try {
      const host = new URL(url).hostname
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.vercel.app')
      ) {
        continue
      }
      return url
    } catch {
      continue
    }
  }

  return 'https://maltaguns.com'
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await (supabase as any)
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('[SEO] Failed to fetch site_settings:', error.message)
    return null
  }

  return data as SiteSettings | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncateDescription(
  text: string | null | undefined,
  maxLength = 160
): string | undefined {
  if (!text) return undefined
  const cleaned = stripHtml(text)
  if (!cleaned) return undefined
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`
}

type BuildMetadataInput = {
  title?: string | null
  description?: string | null
  image?: string | null
  path?: string
  noIndex?: boolean
  siteSettings?: SiteSettings | null
}

export function buildMetadata({
  title,
  description,
  image,
  path,
  noIndex = false,
  siteSettings,
}: BuildMetadataInput): Metadata {
  const siteTitle = siteSettings?.site_title || FALLBACK_TITLE
  const siteDescription = siteSettings?.site_description || FALLBACK_DESCRIPTION
  const resolvedTitle = title?.trim() || siteTitle
  const resolvedDescription =
    truncateDescription(description) || siteDescription
  const resolvedImage =
    image?.trim() || siteSettings?.default_og_image || undefined
  const appUrl = getAppUrl()
  const canonical =
    path !== undefined
      ? `${appUrl}${path.startsWith('/') ? path : `/${path}`}`
      : undefined

  const twitterHandle = siteSettings?.twitter_handle?.replace(/^@/, '')

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    ...(canonical
      ? {
          alternates: {
            canonical,
          },
        }
      : {}),
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: siteTitle,
      type: 'website',
      ...(canonical ? { url: canonical } : {}),
      ...(resolvedImage
        ? {
            images: [
              {
                url: resolvedImage,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: resolvedImage ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description: resolvedDescription,
      ...(twitterHandle ? { site: `@${twitterHandle}` } : {}),
      ...(resolvedImage ? { images: [resolvedImage] } : {}),
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}

function getPageOverride(
  siteSettings: SiteSettings | null,
  section: SectionKey
): { title?: string | null; description?: string | null } {
  const fromJson = siteSettings?.page_seo?.[section]
  if (fromJson?.title || fromJson?.description) {
    return fromJson
  }

  // Legacy flat columns for the original 4 sections
  if ((LEGACY_SECTION_KEYS as readonly string[]).includes(section)) {
    const titleKey = `${section}_meta_title` as keyof SiteSettings
    const descriptionKey = `${section}_meta_description` as keyof SiteSettings
    return {
      title: siteSettings?.[titleKey] as string | null | undefined,
      description: siteSettings?.[descriptionKey] as string | null | undefined,
    }
  }

  return {}
}

/**
 * Metadata for indexed pages managed via /admin/seo.
 * Uses admin overrides when set, otherwise SECTION_SEO_DEFAULTS.
 */
export async function getSectionMetadata(
  section: SectionKey
): Promise<Metadata> {
  const defaults = SECTION_SEO_DEFAULTS[section]
  const siteSettings = await getSiteSettings()
  const override = getPageOverride(siteSettings, section)

  // Home falls back to global site_title/site_description when no home override
  if (section === 'home') {
    return buildMetadata({
      title:
        override.title?.trim() || siteSettings?.site_title || defaults.title,
      description:
        override.description?.trim() ||
        siteSettings?.site_description ||
        defaults.description,
      path: defaults.path,
      siteSettings,
    })
  }

  return buildMetadata({
    title: override.title?.trim() || defaults.title,
    description: override.description?.trim() || defaults.description,
    path: defaults.path,
    siteSettings,
  })
}
