import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  HeroSection,
  RecentListingsSection,
  FeaturedListingsSection,
  LatestArticlesSection,
  UpcomingEventsSection,
  FeaturedEstablishmentsSection,
  ResourcesSection,
  CTASection,
} from '@/components/home'
import { getHomePageData } from '@/lib/public-data'
import { Database } from '@/lib/database.types'
import { JsonLd } from '@/components/seo/JsonLd'
import { getSiteSettings } from '@/lib/seo'
import { buildOrganizationSchema, buildWebSiteSchema } from '@/lib/seo-jsonld'

export const revalidate = 30

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })

  const [{ data: userData }, homeData, siteSettings] = await Promise.all([
    supabase.auth.getUser(),
    getHomePageData(),
    getSiteSettings(),
  ])

  const isAuthenticated = !!userData.user
  const siteName = siteSettings?.site_title || 'MaltaGuns'
  const siteDescription =
    siteSettings?.site_description ||
    'The premier destination for the firearms community in Malta'

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={[
          buildOrganizationSchema({
            name: siteName,
            description: siteDescription,
          }),
          buildWebSiteSchema({
            name: siteName,
            description: siteDescription,
          }),
        ]}
      />
      <HeroSection isAuthenticated={isAuthenticated} />

      <RecentListingsSection listings={homeData.recentListings} />

      <FeaturedListingsSection listings={homeData.featuredListings} />

      <LatestArticlesSection posts={homeData.latestPosts} />

      <UpcomingEventsSection events={homeData.latestEvents} />

      <FeaturedEstablishmentsSection
        establishments={homeData.featuredEstablishments}
      />

      <ResourcesSection />

      <CTASection isAuthenticated={isAuthenticated} />
    </div>
  )
}
