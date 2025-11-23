'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, MapPin, Phone, Mail, Globe, Plus } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LoadingState } from '@/components/ui/loading-state'

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

export default function ServicingPage() {
  const [servicingProviders, setServicingProviders] = useState<Servicing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function fetchServicingProviders() {
      try {
        // Check if user is authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        const { data, error } = await supabase
          .from('servicing')
          .select('*')
          .order('business_name', { ascending: true })

        if (error) throw error
        setServicingProviders(data || [])
      } catch (error) {
        console.error('Error fetching servicing providers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServicingProviders()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading servicing providers..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <BackButton label="Back to Establishments" href="/establishments" />

        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Firearms Servicing</h1>
          <p className="text-muted-foreground">
            Find firearms repair, servicing and maintenance providers across
            Malta
          </p>
        </div>

        {/* Actions - Only show if authenticated */}
        {isAuthenticated && (
          <div className="flex justify-end">
            <Link href="/establishments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your Business
              </Button>
            </Link>
          </div>
        )}

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
      </div>
    </div>
  )
}
