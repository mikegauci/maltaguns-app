import { preload } from 'react-dom'
import { getImageProps } from 'next/image'
import { createClient } from '@/lib/supabase/server'
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
import { JsonLd } from '@/components/seo/JsonLd'
import { getSiteSettings } from '@/lib/seo'
import { buildOrganizationSchema, buildWebSiteSchema } from '@/lib/seo-jsonld'
import heroImage from '@/public/maltaguns-hero-2.jpg'

export const revalidate = 30

function preloadHeroImage() {
  const { props } = getImageProps({
    src: heroImage,
    alt: 'MaltaGuns Hero',
    sizes: '100vw',
    quality: 75,
    fill: true,
  })

  preload(props.src, {
    as: 'image',
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: 'high',
  })
}

export default async function Home() {
  preloadHeroImage()

  const supabase = await createClient()

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
