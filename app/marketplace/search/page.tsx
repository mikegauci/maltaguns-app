'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { PageLayout } from '@/components/ui/page-layout'

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
  is_featured?: boolean
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function getCategoryLabel(category: string, type: 'firearms' | 'non_firearms') {
  const firearmsCategories: Record<string, string> = {
    airguns: 'Airguns',
    ammunition: 'Ammunition',
    revolvers: 'Revolvers',
    pistols: 'Pistols',
    rifles: 'Rifles',
    carbines: 'Carbines',
    shotguns: 'Shotguns',
    black_powder: 'Black powder',
    replica_deactivated: 'Replica or Deactivated',
    crossbow: 'Crossbow',
    schedule_1: 'Schedule 1 (automatic)',
  }

  const nonFirearmsCategories: Record<string, string> = {
    airsoft: 'Airsoft',
    reloading: 'Reloading',
    militaria: 'Militaria',
    accessories: 'Accessories',
  }

  return type === 'firearms'
    ? firearmsCategories[category] || category
    : nonFirearmsCategories[category] || category
}

// Function to singularize a word (basic implementation)
function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'
  } else if (word.endsWith('es')) {
    return word.slice(0, -2)
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1)
  }
  return word
}

async function fetchSearchResults(q: string, categoryParam: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (categoryParam) params.set('category', categoryParam)

  if (q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const singulars = words
      .map(word => singularize(word))
      .filter(s => s && !words.includes(s))
    if (singulars.length > 0) {
      params.set('q', [q, ...singulars].join(' '))
    }
  }

  const res = await fetch(`/api/public/marketplace/search?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to search listings')
  return res.json() as Promise<{
    featuredListings: Listing[]
    listings: Listing[]
  }>
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const categoryParam = searchParams.get('category') || 'all'

  const { type, category } = useMemo(() => {
    let typeValue: string | null = null
    let categoryValue: string | null = null

    if (categoryParam !== 'all') {
      if (categoryParam === 'firearms' || categoryParam === 'non_firearms') {
        typeValue = categoryParam
      } else if (categoryParam.startsWith('firearms-')) {
        typeValue = 'firearms'
        categoryValue = categoryParam.replace('firearms-', '')
      } else if (categoryParam.startsWith('non_firearms-')) {
        typeValue = 'non_firearms'
        categoryValue = categoryParam.replace('non_firearms-', '')
      }
    }

    return { type: typeValue, category: categoryValue }
  }, [categoryParam])

  const searchQuery = useQuery({
    queryKey: ['public-marketplace-search', query, categoryParam],
    queryFn: () => fetchSearchResults(query, categoryParam),
  })

  const listings = searchQuery.data?.listings ?? []
  const featuredListings = searchQuery.data?.featuredListings ?? []
  const isLoading = searchQuery.isLoading

  const renderListingCard = (listing: Listing) => (
    <Link
      key={listing.id}
      href={`/marketplace/listing/${slugify(listing.title)}`}
      className="block"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-video relative overflow-hidden">
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="object-cover w-full h-full"
          />
          {listing.status === 'sold' && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Sold
            </Badge>
          )}
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            {listing.type === 'firearms' ? (
              <div className="inline-flex">
                <Image
                  src="/images/pistol-gun-icon.svg"
                  alt="Firearms"
                  width={16}
                  height={16}
                  className="mr-2"
                />
              </div>
            ) : (
              <div className="inline-flex">
                <Package className="h-4 w-4 mr-2" />
              </div>
            )}
            <Badge variant="secondary">
              {getCategoryLabel(listing.category, listing.type)}
            </Badge>
          </div>
          <h3 className="text-md font-semibold mb-2 line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
            {listing.description}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{formatPrice(listing.price)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <PageLayout padding="md">
      <div className="space-y-2 mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {isLoading
            ? 'Loading...'
            : query
              ? 'Search Results'
              : category
                ? `${getCategoryLabel(category, type as 'firearms' | 'non_firearms')}`
                : type
                  ? type === 'firearms'
                    ? 'Firearms'
                    : 'Non-Firearms'
                  : 'All Listings'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isLoading
            ? 'Searching...'
            : query
              ? `Found ${listings.length} result${listings.length !== 1 ? 's' : ''} for "${query}"`
              : `Showing ${listings.length} listing${listings.length !== 1 ? 's' : ''}`}
        </p>
        <div className="mb-6">
          <Link href="/marketplace">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
      ) : listings.length === 0 && featuredListings.length === 0 ? (
        <Card className="p-6 text-center">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or category filters.
            </p>
            <Link href="/marketplace">
              <Button>Browse All Listings</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {featuredListings.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <Star className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-bold">Featured Listings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {featuredListings.map(renderListingCard)}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">
              {featuredListings.length > 0 ? 'All Results' : 'Search Results'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {listings.map(renderListingCard)}
            </div>
          </div>
        </>
      )}
    </PageLayout>
  )
}
