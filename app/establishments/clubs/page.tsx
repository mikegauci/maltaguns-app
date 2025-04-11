"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, MapPin, Phone, Mail, Globe, Plus } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { LoadingState } from "@/components/ui/loading-state"

// List of authorized user IDs
const AUTHORIZED_CLUB_CREATORS = [
  'e22da8c7-c6af-43b7-8ba0-5bc8946edcda',
  '1a95bbf9-3bca-414d-a99f-1f9c72c15588'
]

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

export default function ClubsPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    async function fetchClubs() {
      try {
        // Check authorization
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setIsAuthorized(AUTHORIZED_CLUB_CREATORS.includes(session.user.id))
        }

        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .order('business_name', { ascending: true })

        if (error) throw error
        setClubs(data || [])
      } catch (error) {
        console.error('Error fetching clubs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClubs()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading clubs..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Shooting Clubs</h1>
          <p className="text-muted-foreground">
            Find shooting clubs and ranges across Malta
          </p>
        </div>

        {/* Actions - Only show if authorized */}
        {isAuthorized && (
          <div className="flex justify-end">
            <Link href="/establishments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your Club
              </Button>
            </Link>
          </div>
        )}

        {/* Clubs Grid */}
        {clubs.length === 0 ? (
          <Card className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clubs listed yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <Link key={club.id} href={`/establishments/clubs/${club.slug || club.id}`}>
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
                        <h3 className="font-semibold text-lg">{club.business_name}</h3>
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
      </div>
    </div>
  )
} 