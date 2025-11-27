import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  price: number
  thumbnail: string | null
}

interface FeaturedListingsSectionProps {
  listings: Listing[]
  formatPrice: (price: number) => string
  slugify: (text: string) => string
}

export const FeaturedListingsSection = ({
  listings,
  formatPrice,
  slugify,
}: FeaturedListingsSectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Featured Listings</h2>
          <p className="text-lg text-muted-foreground">
            Discover premium, verified firearms and accessories in our curated
            listings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.length > 0 ? (
            listings.map(listing => (
              <Link
                key={listing.id}
                href={`/marketplace/listing/${slugify(listing.title)}`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="default" className="mb-2 bg-primary">
                      Featured
                    </Badge>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(listing.price)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">
                No featured listings available at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
