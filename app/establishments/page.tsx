'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { supabase } from '@/lib/supabase'
import { LoadingState } from '@/components/ui/loading-state'

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

export default function EstablishmentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [establishments, setEstablishments] = useState<Establishment[]>([])

  useEffect(() => {
    async function fetchAllEstablishments() {
      try {
        setIsLoading(true)

        // Fetch stores
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('*')

        if (storesError) throw storesError

        // Fetch clubs
        const { data: clubs, error: clubsError } = await supabase
          .from('clubs')
          .select('*')

        if (clubsError) throw clubsError

        // Fetch servicing
        const { data: servicing, error: servicingError } = await supabase
          .from('servicing')
          .select('*')

        if (servicingError) throw servicingError

        // Fetch ranges
        const { data: ranges, error: rangesError } = await supabase
          .from('ranges')
          .select('*')

        if (rangesError) throw rangesError

        // Combine all results and add type field
        const allEstablishments = [
          ...(stores || []).map(store => ({
            ...store,
            type: 'stores' as const,
          })),
          ...(clubs || []).map(club => ({ ...club, type: 'clubs' as const })),
          ...(servicing || []).map(service => ({
            ...service,
            type: 'servicing' as const,
          })),
          ...(ranges || []).map(range => ({
            ...range,
            type: 'range' as const,
          })),
        ]

        // Sort by business name
        allEstablishments.sort((a, b) =>
          a.business_name.localeCompare(b.business_name)
        )

        setEstablishments(allEstablishments)
      } catch (error) {
        console.error('Error fetching establishments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllEstablishments()
  }, [])

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Establishments</h1>
          <p className="text-muted-foreground">
            Find firearms related establishments across Malta
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/establishments/stores">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
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
            </Card>
          </Link>

          <Link href="/establishments/clubs">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
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
            </Card>
          </Link>

          <Link href="/establishments/servicing">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
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
            </Card>
          </Link>

          <Link href="/establishments/ranges">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
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
            </Card>
          </Link>
        </div>

        {/* All Establishments Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">All Establishments</h2>

          {isLoading ? (
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
                  <Card className="h-full hover:shadow-lg transition-shadow">
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
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
