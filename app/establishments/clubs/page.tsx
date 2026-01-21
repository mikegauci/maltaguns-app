'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Users, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
interface Club {
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

async function fetchClubs(): Promise<{ clubs: Club[] }> {
  const res = await fetch('/api/public/establishments/clubs')
  if (!res.ok) throw new Error('Failed to load clubs')
  return res.json()
}

export default function ClubsPage() {
  const query = useQuery({
    queryKey: ['public-establishments-clubs'],
    queryFn: fetchClubs,
  })

  const clubs = query.data?.clubs ?? []

  if (query.isLoading) {
    return (
      <PageLayout centered>
        <LoadingState message="Loading clubs..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Back Button */}
      <BackButton label="Back" href="/establishments" />
      <PageHeader
        title="Shooting Clubs"
        description="Find shooting clubs and ranges across Malta"
      />

      {/* Clubs Grid */}
      {clubs.length === 0 ? (
        <Card className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No clubs listed yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map(club => (
            <Link
              key={club.id}
              href={`/establishments/clubs/${club.slug || club.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {club.logo_url ? (
                      <img
                        src={club.logo_url}
                        alt={club.business_name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {club.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{club.location}</span>
                      </div>
                    </div>
                  </div>

                  {club.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {club.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {club.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{club.phone}</span>
                      </div>
                    )}
                    {club.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{club.email}</span>
                      </div>
                    )}
                    {club.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{club.website}</span>
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
