export type SectionKey =
  | 'home'
  | 'marketplace'
  | 'marketplace_firearms'
  | 'marketplace_non_firearms'
  | 'events'
  | 'blog'
  | 'blog_news'
  | 'blog_guides'
  | 'establishments'
  | 'establishments_stores'
  | 'establishments_clubs'
  | 'establishments_ranges'
  | 'establishments_servicing'
  | 'contact'
  | 'help'
  | 'privacy'
  | 'terms'

export type PageSeoEntry = {
  title?: string | null
  description?: string | null
}

export type PageSeoMap = Partial<Record<SectionKey, PageSeoEntry>>

/** Defaults match on-page copy (or existing static metadata) for each page. */
export const SECTION_SEO_DEFAULTS: Record<
  SectionKey,
  { title: string; description: string; path: string; group: string }
> = {
  home: {
    title: 'MaltaGuns - Firearms Community Hub',
    description: 'The premier destination for the firearms community in Malta',
    path: '/',
    group: 'Core',
  },
  marketplace: {
    title: 'Marketplace | MaltaGuns',
    description:
      'Browse firearms, accessories, and related items from verified sellers across Malta. Buy and sell with confidence in a secure, legally compliant platform dedicated to responsible firearm ownership.',
    path: '/marketplace',
    group: 'Marketplace',
  },
  marketplace_firearms: {
    title: 'Firearms Marketplace | MaltaGuns',
    description:
      'Browse all firearms listings from licensed sellers across Malta.',
    path: '/marketplace/firearms',
    group: 'Marketplace',
  },
  marketplace_non_firearms: {
    title: 'Non-Firearms Marketplace | MaltaGuns',
    description:
      'Browse all non-firearms listings from licensed sellers across Malta.',
    path: '/marketplace/non-firearms',
    group: 'Marketplace',
  },
  events: {
    title: 'Events | MaltaGuns',
    description:
      "Discover upcoming shooting tournaments, training sessions, club activities, and international trips. Connect with Malta's firearms community and participate in events suited for all skill levels.",
    path: '/events',
    group: 'Events',
  },
  blog: {
    title: 'Blog | MaltaGuns',
    description:
      "Read the latest news, guides, and insights from Malta's firearms community. Stay informed about industry updates, safety practices, and expert advice from local dealers and enthusiasts.",
    path: '/blog',
    group: 'Blog',
  },
  blog_news: {
    title: 'News Articles | MaltaGuns',
    description: "Browse news articles from Malta's firearms community.",
    path: '/blog/news',
    group: 'Blog',
  },
  blog_guides: {
    title: 'Guides Articles | MaltaGuns',
    description: "Browse guides from Malta's firearms community.",
    path: '/blog/guides',
    group: 'Blog',
  },
  establishments: {
    title: 'Establishments | MaltaGuns',
    description:
      'Discover trusted firearms dealers, shooting clubs, training ranges, and servicing businesses across Malta. Connect with licensed professionals and certified establishments for all your shooting sports needs.',
    path: '/establishments',
    group: 'Establishments',
  },
  establishments_stores: {
    title: 'Firearms Stores | MaltaGuns',
    description: 'Find licensed firearms dealers and stores across Malta.',
    path: '/establishments/stores',
    group: 'Establishments',
  },
  establishments_clubs: {
    title: 'Shooting Clubs | MaltaGuns',
    description: 'Find shooting clubs and associations across Malta.',
    path: '/establishments/clubs',
    group: 'Establishments',
  },
  establishments_ranges: {
    title: 'Shooting Ranges | MaltaGuns',
    description: 'Find shooting ranges and practice facilities across Malta.',
    path: '/establishments/ranges',
    group: 'Establishments',
  },
  establishments_servicing: {
    title: 'Firearms Servicing | MaltaGuns',
    description:
      'Find firearms repair, servicing and maintenance providers across Malta.',
    path: '/establishments/servicing',
    group: 'Establishments',
  },
  contact: {
    title: 'Contact Us | MaltaGuns',
    description:
      "Have a question or feedback? We'd love to hear from you. Fill out the form below and our team will get back to you as soon as possible.",
    path: '/contact',
    group: 'Info',
  },
  help: {
    title: 'Help Center | MaltaGuns',
    description:
      'Find guides, tutorials, FAQs, and support resources to help you get the most out of MaltaGuns.',
    path: '/help',
    group: 'Info',
  },
  privacy: {
    title: 'Privacy Policy | MaltaGuns',
    description:
      'Privacy Policy for MaltaGuns - Your trusted source for firearms information, marketplace listings, and community events in Malta.',
    path: '/privacy',
    group: 'Legal',
  },
  terms: {
    title: 'Terms and Conditions | MaltaGuns',
    description:
      'Terms and Conditions for MaltaGuns - Your trusted source for firearms information, marketplace listings, and community events in Malta.',
    path: '/terms',
    group: 'Legal',
  },
}

export const SECTION_GROUPS = [
  'Core',
  'Marketplace',
  'Events',
  'Blog',
  'Establishments',
  'Info',
  'Legal',
] as const

export function getSectionsByGroup(group: string): SectionKey[] {
  return (Object.keys(SECTION_SEO_DEFAULTS) as SectionKey[]).filter(
    key => SECTION_SEO_DEFAULTS[key].group === group
  )
}
