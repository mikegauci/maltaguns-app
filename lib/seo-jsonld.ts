import { DEFAULT_OG_IMAGE_PATH, truncateDescription } from '@/lib/seo'
import { getAppUrl, toAbsoluteUrl } from '@/lib/seo-host'

type BreadcrumbItem = {
  name: string
  path: string
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  const appUrl = getAppUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${appUrl}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  }
}

export function buildOrganizationSchema(input?: {
  name?: string
  description?: string
  logo?: string | null
}) {
  const appUrl = getAppUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input?.name || 'MaltaGuns',
    url: appUrl,
    description:
      input?.description ||
      'The premier destination for the firearms community in Malta',
    logo: toAbsoluteUrl(input?.logo || '/maltaguns.png', appUrl),
  }
}

export function buildWebSiteSchema(input?: {
  name?: string
  description?: string
}) {
  const appUrl = getAppUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input?.name || 'MaltaGuns',
    url: appUrl,
    description:
      input?.description ||
      'The premier destination for the firearms community in Malta',
  }
}

export function buildProductSchema(input: {
  name: string
  description?: string | null
  image?: string | null
  price: number
  path: string
  availability?: 'InStock' | 'OutOfStock'
}) {
  const appUrl = getAppUrl()
  const image = toAbsoluteUrl(
    input.image?.trim() || DEFAULT_OG_IMAGE_PATH,
    appUrl
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: truncateDescription(input.description) || undefined,
    image,
    url: `${appUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: input.price,
      availability: `https://schema.org/${input.availability || 'InStock'}`,
      url: `${appUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`,
    },
  }
}

export function buildEventSchema(input: {
  name: string
  description?: string | null
  image?: string | null
  startDate: string
  endDate?: string | null
  location?: string | null
  path: string
  organizer?: string | null
}) {
  const appUrl = getAppUrl()
  const image = toAbsoluteUrl(
    input.image?.trim() || DEFAULT_OG_IMAGE_PATH,
    appUrl
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    description: truncateDescription(input.description) || undefined,
    image,
    startDate: input.startDate,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: input.location
      ? {
          '@type': 'Place',
          name: input.location,
          address: input.location,
        }
      : undefined,
    organizer: input.organizer
      ? {
          '@type': 'Organization',
          name: input.organizer,
        }
      : undefined,
    url: `${appUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`,
  }
}

export function buildArticleSchema(input: {
  headline: string
  description?: string | null
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string | null
  path: string
}) {
  const appUrl = getAppUrl()
  const image = toAbsoluteUrl(
    input.image?.trim() || DEFAULT_OG_IMAGE_PATH,
    appUrl
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: truncateDescription(input.description) || undefined,
    image,
    datePublished: input.datePublished || undefined,
    dateModified: input.dateModified || input.datePublished || undefined,
    author: input.authorName
      ? {
          '@type': 'Person',
          name: input.authorName,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'MaltaGuns',
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl('/maltaguns.png', appUrl),
      },
    },
    mainEntityOfPage: `${appUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`,
  }
}

const ESTABLISHMENT_SCHEMA_TYPE: Record<
  string,
  'Store' | 'SportsActivityLocation' | 'LocalBusiness'
> = {
  stores: 'Store',
  clubs: 'SportsActivityLocation',
  ranges: 'SportsActivityLocation',
  servicing: 'LocalBusiness',
}

export function buildLocalBusinessSchema(input: {
  type: string
  name: string
  description?: string | null
  image?: string | null
  location?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  path: string
}) {
  const appUrl = getAppUrl()
  const image = toAbsoluteUrl(
    input.image?.trim() || DEFAULT_OG_IMAGE_PATH,
    appUrl
  )
  return {
    '@context': 'https://schema.org',
    '@type': ESTABLISHMENT_SCHEMA_TYPE[input.type] || 'LocalBusiness',
    name: input.name,
    description: truncateDescription(input.description) || undefined,
    image,
    url: `${appUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`,
    ...(input.location
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: input.location,
            addressCountry: 'MT',
          },
        }
      : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.website ? { sameAs: [input.website] } : {}),
  }
}
