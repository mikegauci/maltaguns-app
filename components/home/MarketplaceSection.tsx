'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HomeCarousel, HomeCarouselItem } from './HomeCarousel'
import { HomeListingCard } from './HomeListingCard'
import { HomeSectionHeader } from './HomeSectionHeader'
import { HomeSectionShell } from './HomeSectionShell'

interface Listing {
  id: string
  title: string
  price: number
  thumbnail: string | null
}

interface MarketplaceSectionProps {
  featuredListings: Listing[]
  recentListings: Listing[]
}

function FeaturedEmpty() {
  return (
    <div className="rounded-sm border border-dashed border-[var(--home-border)] bg-[var(--home-surface)] p-8 md:p-10 text-center">
      <div className="home-icon-badge mx-auto mb-4 border border-[var(--home-border)] bg-[var(--home-slate)] text-[var(--home-amber)]">
        <Star aria-hidden="true" />
      </div>
      <p className="home-display font-bold uppercase tracking-tight text-[var(--home-ink)] mb-2">
        No featured listings
      </p>
      <p className="text-sm text-[var(--home-muted)] max-w-md mx-auto mb-5">
        Featured listings are promoted by sellers. Browse recent listings below
        or explore the full marketplace.
      </p>
      <Link href="/marketplace">
        <Button className="rounded-sm bg-[var(--home-brand)] text-white hover:bg-[var(--home-brand-deep)] uppercase tracking-wide text-xs font-semibold">
          Browse marketplace
        </Button>
      </Link>
    </div>
  )
}

export function MarketplaceSection({
  featuredListings,
  recentListings,
}: MarketplaceSectionProps) {
  const featured = featuredListings.slice(0, 10)
  const recent = recentListings.slice(0, 10)

  return (
    <HomeSectionShell tone="surface" id="marketplace">
      <HomeSectionHeader
        title="Marketplace"
        description="Featured picks and latest verified listings from Malta's firearms community."
        href="/marketplace"
        linkLabel="View all"
      />

      <div className="space-y-10">
        <div>
          <h3 className="home-display mb-4 text-sm font-bold uppercase tracking-widest text-[var(--home-brand)]">
            Featured
          </h3>
          {featured.length > 0 ? (
            <HomeCarousel density="wide">
              {featured.map(listing => (
                <HomeCarouselItem key={listing.id}>
                  <HomeListingCard
                    id={listing.id}
                    title={listing.title}
                    price={listing.price}
                    thumbnail={listing.thumbnail}
                    featured
                  />
                </HomeCarouselItem>
              ))}
            </HomeCarousel>
          ) : (
            <FeaturedEmpty />
          )}
        </div>

        <div>
          <h3 className="home-display mb-4 text-sm font-bold uppercase tracking-widest text-[var(--home-brand)]">
            Recent
          </h3>
          {recent.length > 0 ? (
            recent.length > 5 ? (
              <HomeCarousel density="wide">
                {recent.map(listing => (
                  <HomeCarouselItem key={listing.id}>
                    <HomeListingCard
                      id={listing.id}
                      title={listing.title}
                      price={listing.price}
                      thumbnail={listing.thumbnail}
                    />
                  </HomeCarouselItem>
                ))}
              </HomeCarousel>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {recent.map(listing => (
                  <HomeListingCard
                    key={listing.id}
                    id={listing.id}
                    title={listing.title}
                    price={listing.price}
                    thumbnail={listing.thumbnail}
                  />
                ))}
              </div>
            )
          ) : (
            <p className="py-8 text-sm text-[var(--home-muted)] border border-dashed border-[var(--home-border)] rounded-sm px-4 text-center">
              No recent listings yet.
            </p>
          )}
        </div>
      </div>
    </HomeSectionShell>
  )
}
