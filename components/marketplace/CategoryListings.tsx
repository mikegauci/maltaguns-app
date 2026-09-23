'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Star, Plus } from 'lucide-react'
import Link from 'next/link'
import { StorageImage } from '@/components/ui/storage-image'
import { PistolGunIcon } from '@/components/icons/PistolGunIcon'
import { AppCard, AppSectionHeading } from '@/components/design-system'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { formatPrice } from '@/lib/format'
import { listingPublicPath } from '@/lib/listing-slug'

function getBackHref(type?: 'firearms' | 'non_firearms', category?: string) {
  if (category && type === 'firearms') return '/marketplace/firearms'
  if (category && type === 'non_firearms') return '/marketplace/non-firearms'
  if (type === 'firearms') return '/marketplace'
  if (type === 'non_firearms') return '/marketplace/non-firearms'
  return '/marketplace'
}

interface Listing {
  id: string
  title: string
  slug?: string
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

interface CategoryListingsProps {
  type?: 'firearms' | 'non_firearms'
  category?: string
  subcategory?: string
  title: string
  description?: string
  initialFeaturedListings?: Listing[]
  initialRegularListings?: Listing[]
}

async function fetchCategoryListingsFromApi(
  type?: 'firearms' | 'non_firearms',
  category?: string,
  subcategory?: string
) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (category) params.set('category', category)
  if (subcategory) params.set('subcategory', subcategory)

  const res = await fetch(
    `/api/public/marketplace/category?${params.toString()}`
  )
  if (!res.ok) throw new Error('Failed to load listings')
  return res.json() as Promise<{
    featuredListings: Listing[]
    regularListings: Listing[]
  }>
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

export default function CategoryListings({
  type,
  category,
  subcategory,
  title,
  description,
  initialFeaturedListings,
  initialRegularListings,
}: CategoryListingsProps) {
  const [featuredListings, setFeaturedListings] = useState<Listing[]>(
    initialFeaturedListings ?? []
  )
  const [regularListings, setRegularListings] = useState<Listing[]>(
    initialRegularListings ?? []
  )
  const [isLoading, setIsLoading] = useState(
    initialFeaturedListings === undefined &&
      initialRegularListings === undefined
  )

  useEffect(() => {
    if (
      initialFeaturedListings !== undefined &&
      initialRegularListings !== undefined
    ) {
      return
    }

    async function fetchListings() {
      try {
        const data = await fetchCategoryListingsFromApi(
          type,
          category,
          subcategory
        )
        setFeaturedListings(data.featuredListings)
        setRegularListings(data.regularListings)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [
    type,
    category,
    subcategory,
    initialFeaturedListings,
    initialRegularListings,
  ])

  // Function to render a listing card
  const renderListingCard = (listing: Listing) => (
    <Link key={listing.id} href={listingPublicPath(listing)}>
      <AppCard featured={listing.is_featured}>
        <div className="aspect-video relative overflow-hidden">
          <StorageImage
            src={listing.thumbnail}
            alt={listing.title}
            className="object-cover"
          />
          {listing.status === 'sold' && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Sold
            </Badge>
          )}
          {listing.is_featured && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            {listing.type === 'firearms' ? (
              <div className="inline-flex">
                <PistolGunIcon className="mr-2 h-4 w-4" />
              </div>
            ) : (
              <div className="inline-flex">
                <Package className="h-4 w-4 mr-2" />
              </div>
            )}
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {getCategoryLabel(listing.category, listing.type)}
            </Badge>
          </div>
          <h3 className="text-sm sm:text-md font-semibold mb-1 sm:mb-2 line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 sm:mb-4 line-clamp-2 min-h-[40px]">
            {listing.description}
          </p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm sm:text-lg font-bold">
              {formatPrice(listing.price)}
            </p>
            {listing.type === 'firearms' && listing.calibre && (
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs shrink-0"
              >
                {listing.calibre}
              </Badge>
            )}
          </div>
        </CardContent>
      </AppCard>
    </Link>
  )

  return (
    <PageLayout>
      <PageHeader
        align="center"
        backHref={getBackHref(type, category)}
        title={title}
        description={description}
        className="mb-4"
      />
      <div className="mb-6 flex justify-center">
        <Link href="/marketplace/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
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
              Be the first to post a listing in this category!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {featuredListings.length > 0 && (
            <div>
              <AppSectionHeading
                icon={<Star className="mr-2 h-5 w-5 text-primary" />}
              >
                Featured Listings
              </AppSectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {featuredListings.map(renderListingCard)}
              </div>
            </div>
          )}

          {regularListings.length > 0 && (
            <div>
              <AppSectionHeading>
                {featuredListings.length > 0 ? 'All Listings' : 'Listings'}
              </AppSectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {regularListings.map(renderListingCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
