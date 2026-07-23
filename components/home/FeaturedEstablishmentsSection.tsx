'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StorageImage } from '@/components/ui/storage-image'
import { Store, MapPin, Wrench, Phone, Mail, Globe } from 'lucide-react'
import Link from 'next/link'
import { HomeCarousel, HomeCarouselItem } from './HomeCarousel'

interface Establishment {
  id: string
  type: string
  slug?: string | null
  business_name: string
  location: string
  description?: string | null
  logo_url?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
}

interface FeaturedEstablishmentsSectionProps {
  establishments: Establishment[]
}

export const FeaturedEstablishmentsSection = ({
  establishments,
}: FeaturedEstablishmentsSectionProps) => {
  return (
    <section className="py-16 bg-accent/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Featured Establishments
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Looking for trusted dealers or shooting ranges in Malta? Check out
            these featured establishments that provide reliable and top-quality
            services.
          </p>
        </div>

        {establishments.length > 0 ? (
          <HomeCarousel>
            {establishments.slice(0, 10).map(establishment => (
              <HomeCarouselItem
                key={`${establishment.type}-${establishment.id}`}
              >
                <Link
                  href={`/establishments/${establishment.type === 'store' ? 'stores' : establishment.type}/${
                    establishment.slug || establishment.id
                  }`}
                  className="block h-full"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <CardContent className="p-3 md:p-6 text-center md:text-left">
                      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mb-2 md:mb-4">
                        {establishment.logo_url ? (
                          <StorageImage
                            src={establishment.logo_url}
                            alt={establishment.business_name}
                            width={64}
                            height={64}
                            sizes="64px"
                            fallbackSrc="/maltaguns.png"
                            className="w-10 h-10 md:w-16 md:h-16 object-contain rounded-lg shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-16 md:h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            {establishment.type === 'store' ? (
                              <Store className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground" />
                            ) : establishment.type === 'range' ? (
                              <MapPin className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground" />
                            ) : (
                              <Wrench className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm md:text-lg line-clamp-2">
                            {establishment.business_name}
                          </h3>
                          <div className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                            <span className="line-clamp-1">
                              {establishment.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {establishment.description && (
                        <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2 hidden sm:block">
                          {establishment.description}
                        </p>
                      )}

                      <div className="space-y-1 md:space-y-2 text-xs md:text-sm hidden md:block">
                        {establishment.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {establishment.phone}
                            </span>
                          </div>
                        )}
                        {establishment.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {establishment.email}
                            </span>
                          </div>
                        )}
                        {establishment.website && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {establishment.website}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </HomeCarouselItem>
            ))}
          </HomeCarousel>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Link href="/establishments">
            <Button>View All Establishments</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
