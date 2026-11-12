import { preload } from 'react-dom'
import { getImageProps } from 'next/image'
import {
  HeroSection,
  MarketplaceSection,
  ArticlesEventsSection,
  FeaturedEstablishmentsSection,
  ResourcesSection,
  CTASection,
} from '@/components/home'
import { getHomePageData } from '@/lib/public-data'
import { JsonLd } from '@/components/seo/JsonLd'
import { getSiteSettings } from '@/lib/seo'
import { buildOrganizationSchema, buildWebSiteSchema } from '@/lib/seo-jsonld'
import heroImage from '@/public/maltaguns-hero-2.jpg'

export const revalidate = 300

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

  const [homeData, siteSettings] = await Promise.all([
    getHomePageData(),
    getSiteSettings(),
  ])

  const siteName = siteSettings?.site_title || 'MaltaGuns'
  const siteDescription =
    siteSettings?.site_description ||
    'The premier destination for the firearms community in Malta'

  return (
    <div className="home min-h-screen">
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
      <HeroSection />

      <MarketplaceSection
        featuredListings={homeData.featuredListings}
        recentListings={homeData.recentListings}
      />

      <ArticlesEventsSection
        posts={homeData.latestPosts}
        events={homeData.latestEvents}
        eventsArePast={homeData.eventsArePast}
      />

      <FeaturedEstablishmentsSection
        establishments={homeData.featuredEstablishments}
      />

      <ResourcesSection />

      <CTASection />
    </div>
  )
}
