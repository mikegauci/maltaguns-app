'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Mail, Globe } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { LoadingState } from '@/components/ui/loading-state'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface Range {
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

async function fetchRanges(): Promise<{ ranges: Range[] }> {
  const res = await fetch('/api/public/establishments/ranges')
  if (!res.ok) throw new Error('Failed to load ranges')
  return res.json()
}

export default function RangesPage() {
  const query = useQuery({
    queryKey: ['public-establishments-ranges'],
    queryFn: fetchRanges,
  })

  const ranges = query.data?.ranges ?? []

  if (query.isLoading) {
    return (
      <PageLayout centered>
        <LoadingState message="Loading shooting ranges..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout padding="md" withSpacing>
      {/* Back Button */}
      <BackButton label="Back to Establishments" href="/establishments" />

      {/* Hero Section */}
      <PageHeader
        title="Shooting Ranges"
        description="Find shooting ranges and facilities across Malta"
      />

      {/* Ranges Grid */}
      {ranges.length === 0 ? (
        <Card className="p-6 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No shooting ranges listed yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ranges.map(range => (
            <Link
              key={range.id}
              href={`/establishments/ranges/${range.slug || range.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {range.logo_url ? (
                      <img
                        src={range.logo_url}
                        alt={range.business_name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <MapPin className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {range.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{range.location}</span>
                      </div>
                    </div>
                  </div>

                  {range.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {range.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {range.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{range.phone}</span>
                      </div>
                    )}
                    {range.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{range.email}</span>
                      </div>
                    )}
                    {range.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{range.website}</span>
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
