import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/profile',
          '/profile/',
          '/login',
          '/register',
          '/reset-password',
          '/checkout',
          '/unsubscribe',
          '/wishlist',
          '/notifications',
          '/marketplace/search',
          '/*/edit',
          '/*/edit/',
          '/events/create',
          '/blog/create',
          '/establishments/create',
          '/marketplace/create',
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
