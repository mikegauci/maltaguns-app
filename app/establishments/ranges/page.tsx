"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, Globe, Plus } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { LoadingState } from "@/components/ui/loading-state"

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

export default function RangesPage() {
  const router = useRouter()
  const [ranges, setRanges] = useState<Range[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function fetchRanges() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        const { data, error } = await supabase
          .from('ranges')
          .select('*')
          .order('business_name', { ascending: true })

        if (error) throw error
        setRanges(data || [])
      } catch (error) {
        console.error('Error fetching ranges:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRanges()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading shooting ranges..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Shooting Ranges</h1>
          <p className="text-muted-foreground">
            Find shooting ranges and facilities across Malta
          </p>
        </div>

        {/* Actions - Only show if authenticated */}
        {isAuthenticated && (
          <div className="flex justify-end">
            <Link href="/establishments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your Range
              </Button>
            </Link>
          </div>
        )}

        {/* Ranges Grid */}
        {ranges.length === 0 ? (
          <Card className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shooting ranges listed yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ranges.map((range) => (
              <Link key={range.id} href={`/establishments/ranges/${range.slug || range.id}`}>
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
                        <h3 className="font-semibold text-lg">{range.business_name}</h3>
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
      </div>
    </div>
  )
} 