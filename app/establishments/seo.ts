import type { Metadata } from 'next'
import { fetchEstablishmentBySlug } from './server'
import type { EstablishmentType } from './types'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'

export async function generateEstablishmentMetadata(
  type: EstablishmentType,
  slug: string
): Promise<Metadata> {
  const establishment = await fetchEstablishmentBySlug(type, slug)
  if (!establishment) {
    return buildMetadata({
      title: 'Establishment Not Found | MaltaGuns',
      noIndex: true,
    })
  }

  const siteSettings = await getSiteSettings()
  return buildMetadata({
    title:
      establishment.meta_title || `${establishment.business_name} | MaltaGuns`,
    description:
      establishment.meta_description ||
      truncateDescription(establishment.description) ||
      undefined,
    image: establishment.logo_url || undefined,
    path: `/establishments/${type}/${slug}`,
    siteSettings,
  })
}
