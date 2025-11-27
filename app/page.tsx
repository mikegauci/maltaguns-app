'use client'

import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { useHomePageData } from '@/hooks/useHomePageData'
import {
  HeroSection,
  RecentListingsSection,
  FeaturedListingsSection,
  LatestArticlesSection,
  UpcomingEventsSection,
  FeaturesGrid,
  FeaturedEstablishmentsSection,
  ResourcesSection,
  CTASection,
} from '@/components/home'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

export default function Home() {
  const { data, isLoading, error } = useHomePageData()
  const {
    recentListings,
    featuredListings,
    latestPosts,
    latestEvents,
    featuredEstablishments,
    isAuthenticated,
  } = data

  function formatPrice(price: number) {
    return new Intl.NumberFormat('en-MT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading content..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load homepage data</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection isAuthenticated={isAuthenticated} />

      <RecentListingsSection
        listings={recentListings}
        formatPrice={formatPrice}
        slugify={slugify}
      />

      <FeaturedListingsSection
        listings={featuredListings}
        formatPrice={formatPrice}
        slugify={slugify}
      />

      <LatestArticlesSection posts={latestPosts} />

      <UpcomingEventsSection events={latestEvents} />

      <FeaturesGrid />

      <FeaturedEstablishmentsSection establishments={featuredEstablishments} />

      <ResourcesSection />

      <CTASection isAuthenticated={isAuthenticated} />
    </div>
  )
}
