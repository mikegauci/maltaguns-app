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

export const revalidate = 30

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })

  const [{ data: userData }, homeData] = await Promise.all([
    supabase.auth.getUser(),
    getHomePageData(),
  ])

  const isAuthenticated = !!userData.user

  return (
    <div className="min-h-screen bg-background">
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
