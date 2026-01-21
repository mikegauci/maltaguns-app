'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { LoadingState } from '@/components/ui/loading-state'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface Servicing {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  slug: string
}

async function fetchServicingProviders(): Promise<{ servicing: Servicing[] }> {
  const res = await fetch('/api/public/establishments/servicing')
  if (!res.ok) throw new Error('Failed to load servicing providers')
  return res.json()
}

export default function ServicingPage() {
  const query = useQuery({
    queryKey: ['public-establishments-servicing'],
    queryFn: fetchServicingProviders,
  })

  const servicingProviders = query.data?.servicing ?? []

  if (query.isLoading) {
    return (
      <PageLayout padding="md" withSpacing>
        <LoadingState message="Loading servicing providers..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout padding="md" withSpacing>
      <BackButton label="Back" href="/establishments" />
      <PageHeader
        title="Firearms Servicing"
        description="Find firearms repair, servicing and maintenance providers across Malta"
      />

      {/* Servicing Grid */}
      {servicingProviders.length === 0 ? (
        <Card className="p-6 text-center">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No servicing providers listed yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicingProviders.map(provider => (
            <Link
              key={provider.id}
              href={`/establishments/servicing/${provider.slug || provider.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt={provider.business_name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Wrench className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {provider.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{provider.location}</span>
                      </div>
                    </div>
                  </div>

                  {provider.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {provider.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {provider.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{provider.email}</span>
                      </div>
                    )}
                    {provider.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{provider.website}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
