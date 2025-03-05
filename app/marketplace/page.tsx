"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun as Gun, Package, Star } from "lucide-react"
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
  status: string
  updated_at: string
  is_featured?: boolean
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
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([])
  const [regularListings, setRegularListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      try {
        // Get current date
        const now = new Date()
        
        // Calculate date 7 days ago
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(now.getDate() - 7)
        
        // Format for Supabase query
        const sevenDaysAgoStr = sevenDaysAgo.toISOString()
        
        // Fetch active listings and sold listings less than 7 days old
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .or(`status.eq.active,and(status.eq.sold,updated_at.gt.${sevenDaysAgoStr})`)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        // Filter out inactive listings
        const filteredListings = data ? data.filter(listing => listing.status !== 'inactive') : []
        
        // Fetch featured listings
        const { data: featuredData, error: featuredError } = await supabase
          .from('featured_listings')
          .select('listing_id')
          .gt('end_date', new Date().toISOString())
        
        if (featuredError) throw featuredError
        
        // Create a set of featured listing IDs for quick lookup
        const featuredIds = new Set(featuredData?.map(item => item.listing_id) || [])
        
        // Separate featured and regular listings
        const featured: Listing[] = []
        const regular: Listing[] = []
        
        filteredListings.forEach(listing => {
          // Add to featured if it's in the featured IDs set
          if (featuredIds.has(listing.id)) {
            featured.push({
              ...listing,
              is_featured: true
            })
          } 
          
          // Always add to regular listings - this ensures a listing appears in both sections if featured
          regular.push(listing)
        })
        
        setFeaturedListings(featured)
        setRegularListings(regular)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [])

  // Function to render a listing card
  const renderListingCard = (listing: Listing) => (
    <Link 
      key={listing.id} 
      href={`/marketplace/listing/${listing.id}/${slugify(listing.title)}`}
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${listing.is_featured ? 'border-2 border-red-500' : ''}`}>
        <div className="aspect-video relative overflow-hidden">
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="object-cover w-full h-full"
          />
          {listing.status === 'sold' && (
            <Badge variant="destructive" className="absolute top-2 right-2">Sold</Badge>
          )}
          {listing.is_featured && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
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
  )

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
        ) : featuredListings.length === 0 && regularListings.length === 0 ? (
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
          <div className="space-y-8">
            {featuredListings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-red-500" />
                  Featured Listings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredListings.map(renderListingCard)}
                </div>
              </div>
            )}
            
            {regularListings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  {featuredListings.length > 0 ? 'All Listings' : 'Listings'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularListings.map(renderListingCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}