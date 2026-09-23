'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { AppCard, AppSectionHeading } from '@/components/design-system'
import {
  Store,
  Users,
  Wrench,
  MapPin,
  Phone,
  Mail,
  Globe,
  Boxes,
} from 'lucide-react'
import Link from 'next/link'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

interface Establishment {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  slug: string
  type: 'stores' | 'club' | 'servicing' | 'range'
}

async function fetchEstablishments(): Promise<{
  establishments: Establishment[]
}> {
  const res = await fetch('/api/public/establishments')
  if (!res.ok) throw new Error('Failed to load establishments')
  return res.json()
}

export default function EstablishmentsPage() {
  const query = useQuery({
    queryKey: ['public-establishments'],
    queryFn: fetchEstablishments,
  })

  const establishments = query.data?.establishments ?? []

  // Icon component based on establishment type
  const getEstablishmentIcon = (type: string) => {
    switch (type) {
      case 'stores':
        return <Store className="h-8 w-8 text-muted-foreground" />
      case 'club':
        return <Users className="h-8 w-8 text-muted-foreground" />
      case 'servicing':
        return <Wrench className="h-8 w-8 text-muted-foreground" />
      case 'range':
        return <MapPin className="h-8 w-8 text-muted-foreground" />
      default:
        return <Store className="h-8 w-8 text-muted-foreground" />
    }
  }

  return (
    <PageLayout>
      <PageHeader
        align="center"
        title="Establishments"
        description="Discover trusted firearms dealers, shooting clubs, training ranges, and servicing businesses across Malta. Connect with licensed professionals and certified establishments for all your shooting sports needs."
      />
      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/establishments/stores">
          <AppCard className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Stores</h3>
                  <p className="text-muted-foreground">
                    Find licensed firearms dealers and stores across Malta
                  </p>
                </div>
              </div>
            </CardContent>
          </AppCard>
        </Link>

        <Link href="/establishments/clubs">
          <AppCard className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Clubs</h3>
                  <p className="text-muted-foreground">
                    Find shooting clubs and associations across Malta
                  </p>
                </div>
              </div>
            </CardContent>
          </AppCard>
        </Link>

        <Link href="/establishments/servicing">
          <AppCard className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Servicing</h3>
                  <p className="text-muted-foreground">
                    Find firearms repair and servicing centers across Malta
                  </p>
                </div>
              </div>
            </CardContent>
          </AppCard>
        </Link>

        <Link href="/establishments/ranges">
          <AppCard className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Ranges</h3>
                  <p className="text-muted-foreground">
                    Discover shooting ranges and practice facilities across
                    Malta
                  </p>
                </div>
              </div>
            </CardContent>
          </AppCard>
        </Link>
      </div>

      <div className="mt-12">
        <AppSectionHeading className="mb-6 text-2xl">
          All Establishments
        </AppSectionHeading>

        {query.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingState message="Loading establishments..." />
          </div>
        ) : establishments.length === 0 ? (
          <Card className="p-6 text-center">
            <Boxes className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No establishments listed yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {establishments.map(establishment => (
              <Link
                key={`${establishment.type}-${establishment.id}`}
                href={`/establishments/${establishment.type === 'stores' ? 'stores' : establishment.type}/${establishment.slug || establishment.id}`}
              >
                <AppCard className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {establishment.logo_url ? (
                        <img
                          src={establishment.logo_url}
                          alt={establishment.business_name}
                          className="w-16 h-16 object-contain rounded-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                          {getEstablishmentIcon(establishment.type)}
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
                </AppCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
