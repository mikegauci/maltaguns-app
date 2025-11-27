import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Store, MapPin, Wrench, Phone, Mail, Globe } from 'lucide-react'
import Link from 'next/link'

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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Featured Establishments</h2>
          <p className="text-lg text-muted-foreground">
            Looking for trusted dealers or shooting ranges in Malta? <br />
            Check out these featured establishments that provide reliable and
            top-quality services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {establishments.map(establishment => (
            <Link
              key={`${establishment.type}-${establishment.id}`}
              href={`/establishments/${establishment.type === 'store' ? 'stores' : establishment.type}/${
                establishment.slug || establishment.id
              }`}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {establishment.logo_url ? (
                      <img
                        src={establishment.logo_url}
                        alt={establishment.business_name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        {establishment.type === 'store' ? (
                          <Store className="h-8 w-8 text-muted-foreground" />
                        ) : establishment.type === 'range' ? (
                          <MapPin className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <Wrench className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {establishment.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{establishment.location}</span>
                      </div>
                    </div>
                  </div>

                  {establishment.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {establishment.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {establishment.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{establishment.phone}</span>
                      </div>
                    )}
                    {establishment.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{establishment.email}</span>
                      </div>
                    )}
                    {establishment.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{establishment.website}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/establishments">
            <Button>View All Establishments</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
