import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase/public'
import {
  SECTION_SEO_DEFAULTS,
  type PageSeoMap,
  type SectionKey,
} from '@/lib/seo-defaults'
import { getAppUrl, isNonProductionHost, toAbsoluteUrl } from '@/lib/seo-host'

export type { SectionKey, PageSeoMap }
export { SECTION_SEO_DEFAULTS }
export { getAppUrl, isNonProductionHost, toAbsoluteUrl }

export type SiteSettings = {
  id: number
  site_title: string | null
  site_description: string | null
  default_og_image: string | null
  twitter_handle: string | null
  page_seo: PageSeoMap | null
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
export const DEFAULT_OG_IMAGE_PATH = '/images/maltaguns-default-img.jpg'

const LEGACY_SECTION_KEYS = [
  'marketplace',
  'events',
  'blog',
  'establishments',
] as const

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
  const appUrl = getAppUrl()
  const rawImage =
    image?.trim() ||
    siteSettings?.default_og_image?.trim() ||
    DEFAULT_OG_IMAGE_PATH
  const resolvedImage = toAbsoluteUrl(rawImage, appUrl)
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
      : noIndex
        ? {
            alternates: {
              canonical: null,
            },
          }
        : {}),
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: siteTitle,
      type: 'website',
      ...(canonical ? { url: canonical } : noIndex ? { url: undefined } : {}),
      images: [
        {
          url: resolvedImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      ...(twitterHandle ? { site: `@${twitterHandle}` } : {}),
      images: [resolvedImage],
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

export async function getSectionMetadata(
  section: SectionKey
): Promise<Metadata> {
  const defaults = SECTION_SEO_DEFAULTS[section]
  const siteSettings = await getSiteSettings()
  const override = getPageOverride(siteSettings, section)

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
