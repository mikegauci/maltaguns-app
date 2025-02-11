"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Store, MapPin, Phone, Mail, Globe, Plus } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface Retailer {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
}

export default function RetailersPage() {
  const router = useRouter()
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function fetchRetailers() {
      try {
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .order('business_name', { ascending: true })

        if (error) throw error
        setRetailers(data || [])
      } catch (error) {
        console.error('Error fetching retailers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    fetchRetailers()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading retailers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Firearms Retailers</h1>
          <p className="text-muted-foreground">
            Find licensed firearms dealers and retailers across Malta
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!isAuthenticated) {
                router.push('/login')
                return
              }
              router.push('/retailers/create')
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your Business
          </Button>
        </div>

        {/* Retailers Grid */}
        {retailers.length === 0 ? (
          <Card className="p-6 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No retailers listed yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {retailers.map((retailer) => (
              <Link key={retailer.id} href={`/retailers/${retailer.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {retailer.logo_url ? (
                        <img
                          src={retailer.logo_url}
                          alt={retailer.business_name}
                          className="w-16 h-16 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Store className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{retailer.business_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{retailer.location}</span>
                        </div>
                      </div>
                    </div>

                    {retailer.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {retailer.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {retailer.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{retailer.phone}</span>
                        </div>
                      )}
                      {retailer.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{retailer.email}</span>
                        </div>
                      )}
                      {retailer.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{retailer.website}</span>
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