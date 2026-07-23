import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase/public'
import { getAppUrl } from '@/lib/seo'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/marketplace',
    '/marketplace/firearms',
    '/marketplace/non-firearms',
    '/events',
    '/blog',
    '/blog/news',
    '/blog/guides',
    '/establishments',
    '/establishments/stores',
    '/establishments/clubs',
    '/establishments/ranges',
    '/establishments/servicing',
    '/contact',
    '/help',
    '/privacy',
    '/terms',
    '/cookie-policy',
  ].map(path => ({
    url: `${appUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const [
    listingsResult,
    eventsResult,
    blogResult,
    storesResult,
    clubsResult,
    rangesResult,
    servicingResult,
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('title, updated_at, created_at, expires_at')
      .eq('status', 'active'),
    supabase.from('events').select('slug, id, updated_at, created_at'),
    supabase
      .from('blog_posts')
      .select('slug, category, updated_at, created_at')
      .eq('published', true),
    supabase.from('stores').select('slug, updated_at, created_at'),
    supabase.from('clubs').select('slug, created_at'),
    supabase.from('ranges').select('slug, created_at'),
    supabase.from('servicing').select('slug, created_at'),
  ])

  const nowIso = new Date().toISOString()
  const listingEntries: MetadataRoute.Sitemap = (listingsResult.data || [])
    .filter((listing: any) => {
      if (!listing.expires_at) return true
      return listing.expires_at > nowIso
    })
    .map((listing: any) => ({
      url: `${appUrl}/marketplace/listing/${slugify(listing.title)}`,
      lastModified: new Date(listing.updated_at || listing.created_at || now),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

  const eventEntries: MetadataRoute.Sitemap = (eventsResult.data || [])
    .filter((event: any) => event.slug || event.id)
    .map((event: any) => ({
      url: `${appUrl}/events/${event.slug || event.id}`,
      lastModified: new Date(event.updated_at || event.created_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const blogEntries: MetadataRoute.Sitemap = (blogResult.data || [])
    .filter((post: any) => post.slug && post.category)
    .map((post: any) => ({
      url: `${appUrl}/blog/${post.category}/${post.slug}`,
      lastModified: new Date(post.updated_at || post.created_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const mapEstablishments = (
    rows: any[] | null,
    type: string
  ): MetadataRoute.Sitemap =>
    (rows || [])
      .filter(row => row.slug)
      .map(row => ({
        url: `${appUrl}/establishments/${type}/${row.slug}`,
        lastModified: new Date(row.updated_at || row.created_at || now),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))

  return [
    ...staticRoutes,
    ...listingEntries,
    ...eventEntries,
    ...blogEntries,
    ...mapEstablishments(storesResult.data, 'stores'),
    ...mapEstablishments(clubsResult.data, 'clubs'),
    ...mapEstablishments(rangesResult.data, 'ranges'),
    ...mapEstablishments(servicingResult.data, 'servicing'),
  ]
}
