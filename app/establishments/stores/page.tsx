'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Store, MapPin, Phone, Mail, Globe, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { LoadingState } from '@/components/ui/loading-state'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

// List of authorized user IDs
const AUTHORIZED_STORE_CREATORS = [
  'e22da8c7-c6af-43b7-8ba0-5bc8946edcda',
  '1a95bbf9-3bca-414d-a99f-1f9c72c15588',
]

interface Store {
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

async function fetchStores(): Promise<{ stores: Store[] }> {
  const res = await fetch('/api/public/establishments/stores')
  if (!res.ok) throw new Error('Failed to load stores')
  return res.json()
}

export default function StoresPage() {
  const { supabase, session } = useSupabase()
  const [isAuthorized, setIsAuthorized] = useState(false)

  const query = useQuery({
    queryKey: ['public-establishments-stores'],
    queryFn: fetchStores,
  })

  const stores = query.data?.stores ?? []

  const isAuthorizedUser = useMemo(
    () =>
      !!session?.user && AUTHORIZED_STORE_CREATORS.includes(session.user.id),
    [session?.user]
  )

  useEffect(() => {
    setIsAuthorized(isAuthorizedUser)
  }, [isAuthorizedUser])

  if (query.isLoading) {
    return (
      <PageLayout centered>
        <LoadingState message="Loading stores..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Hero Section */}
      <PageHeader
        title="Firearms Stores"
        description="Find licensed firearms dealers and stores across Malta"
      />
      <BackButton label="Back to Establishments" href="/establishments" />

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <Card className="p-6 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No stores listed yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <Link
              key={store.id}
              href={`/establishments/stores/${store.slug || store.id}`}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.business_name}
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Store className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {store.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{store.location}</span>
                      </div>
                    </div>
                  </div>

                  {store.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {store.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {store.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{store.phone}</span>
                      </div>
                    )}
                    {store.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{store.email}</span>
                      </div>
                    )}
                    {store.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{store.website}</span>
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
