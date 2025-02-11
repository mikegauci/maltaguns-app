"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun as Gun, Package } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface Listing {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  created_at: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

function getCategoryLabel(category: string, type: 'firearms' | 'non_firearms') {
  const firearmsCategories: Record<string, string> = {
    airguns: "Airguns",
    revolvers: "Revolvers",
    pistols: "Pistols",
    rifles: "Rifles",
    carbines: "Carbines",
    shotguns: "Shotguns",
    black_powder: "Black powder",
    replica_deactivated: "Replica or Deactivated",
    crossbow: "Crossbow",
    schedule_1: "Schedule 1 (automatic)"
  }

  const nonFirearmsCategories: Record<string, string> = {
    airsoft: "Airsoft",
    reloading: "Reloading",
    militaria: "Militaria",
    accessories: "Accessories"
  }

  return type === 'firearms' 
    ? firearmsCategories[category] || category
    : nonFirearmsCategories[category] || category
}

function getSubcategoryLabel(category: string, subcategory: string): string {
  const subcategories = {
    airsoft: {
      airsoft_guns: "Airsoft Guns",
      bbs_co2: "BBs & CO2",
      batteries_electronics: "Batteries & Electronics",
      clothing: "Clothing",
      other: "Other",
    },
    reloading: {
      presses: "Presses",
      dies: "Dies",
      tools: "Tools",
      tumblers_media: "Tumblers & Media",
      primers_heads: "Primers & Heads",
      other: "Other",
    },
    militaria: {
      uniforms: "Uniforms",
      helmets: "Helmets",
      swords_bayonets_knives: "Swords, Bayonets & Knives",
      medals_badges: "Medals & Badges",
      other: "Other",
    },
    accessories: {
      cleaning_maintenance: "Cleaning & Maintenance",
      bipods_stands: "Bipods & Stands",
      slings_holsters: "Slings & Holsters",
      scopes_sights_optics: "Scopes, Sights & Optics",
      magazines: "Magazines",
      books_manuals: "Books & Manuals",
      hunting_equipment: "Hunting Equipment",
      safes_cabinets: "Safes & Cabinets",
      ammo_boxes: "Ammo Boxes",
      gun_cases: "Gun Cases",
      safety_equipment: "Safety Equipment",
      grips: "Grips",
      other: "Other",
    },
  } as const;

  if (!(category in subcategories)) {
    return subcategory; // Return original if category doesn't exist
  }

  const categorySubcategories = subcategories[category as keyof typeof subcategories];

  return categorySubcategories[subcategory as keyof typeof categorySubcategories] || subcategory;
}


export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) throw error
        setListings(data || [])
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">Browse verified listings from licensed sellers</p>
          </div>
          <Link href="/marketplace/create">
            <Button>
              <Gun className="mr-2 h-4 w-4" />
              Post Listing
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-6 text-center">
            <CardHeader>
              <CardTitle>No Listings Found</CardTitle>
              <CardDescription>
                Be the first to post a listing in the marketplace!
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/marketplace/create">
                <Button>
                  <Gun className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link 
                key={listing.id} 
                href={`/marketplace/listing/${listing.id}/${slugify(listing.title)}`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {listing.type === 'firearms' ? (
                        <Gun className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                      <Badge variant="secondary">
                        {getCategoryLabel(listing.category, listing.type)}
                      </Badge>
                      {listing.subcategory && (
                        <Badge variant="outline">
                          {getSubcategoryLabel(listing.category, listing.subcategory)}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">
                        {formatPrice(listing.price)}
                      </p>
                      {listing.type === 'firearms' && listing.calibre && (
                        <Badge variant="secondary">
                          {listing.calibre}
                        </Badge>
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