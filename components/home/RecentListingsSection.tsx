'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StorageImage } from '@/components/ui/storage-image'
import { HomeCarousel, HomeCarouselItem } from './HomeCarousel'
import { formatPrice, slugify } from '@/lib/format'

interface Listing {
  id: string
  title: string
  price: number
  thumbnail: string | null
}

interface RecentListingsSectionProps {
  listings: Listing[]
}

export const RecentListingsSection = ({
  listings,
}: RecentListingsSectionProps) => {
  return (
    <section className="py-16 bg-accent/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Recent Listings
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Explore the latest listings and find verified firearms and
            accessories.
          </p>
        </div>

        {listings.length > 0 ? (
          <HomeCarousel>
            {listings.slice(0, 10).map(listing => (
              <HomeCarouselItem key={listing.id}>
                <Link
                  href={`/marketplace/listing/${slugify(listing.title)}`}
                  className="block h-full"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <StorageImage
                        src={listing.thumbnail}
                        alt={listing.title}
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <CardContent className="p-2.5 md:p-4 text-center md:text-left">
                      <Badge
                        variant="secondary"
                        className="mb-1.5 md:mb-2 text-[10px] md:text-xs"
                      >
                        {listing.title.split(' ')[0]}
                      </Badge>
                      <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 line-clamp-1">
                        {listing.title}
                      </h3>
                      <p className="text-sm md:text-lg font-bold text-primary">
                        {formatPrice(listing.price)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </HomeCarouselItem>
            ))}
          </HomeCarousel>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Link href="/marketplace">
            <Button>View All Listings</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
