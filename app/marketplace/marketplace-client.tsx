'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Star, Plus, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AutoFeatureHandler } from './auto-feature-handler'
import Image from 'next/image'
import { StorageImage } from '@/components/ui/storage-image'
import { WishlistButton } from '@/components/marketplace/WishlistButton'
import { MarketplaceCategoryNav } from '@/components/marketplace/MarketplaceCategoryNav'
import { PageHeader } from '@/components/ui/page-header'
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
    currency: 'EUR',
  }).format(price)
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

type MarketplaceClientProps = {
  featuredListings: Listing[]
  regularListings: Listing[]
}

export default function MarketplaceClient({
  featuredListings,
  regularListings,
}: MarketplaceClientProps) {
  const router = useRouter()
  const error = null

  const renderListingCard = (listing: Listing) => {
    const listingHref = `/marketplace/listing/${slugify(listing.title)}`
    const categoryHref = `/marketplace/${
      listing.type === 'firearms' ? 'firearms' : 'non-firearms'
    }/${listing.category}`

    return (
      <Card
        className={`relative overflow-hidden hover:shadow-lg transition-shadow h-full ${
          listing.is_featured ? 'border-2 border-red-500' : ''
        }`}
      >
        <Link href={listingHref} className="block">
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
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer text-[10px] sm:text-xs"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(categoryHref)
                }}
              >
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
        </Link>
        <div className="absolute top-0 right-0 w-full aspect-video pointer-events-none">
          <div className="absolute bottom-2 right-2 pointer-events-auto">
            <WishlistButton
              listingId={listing.id}
              size="sm"
              variant="ghost"
              className="bg-background/80 hover:bg-background/90"
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Marketplace"
        description="Browse firearms, accessories, and related items from verified sellers across Malta. Buy and sell with confidence in a secure, legally compliant platform dedicated to responsible firearm ownership."
      />
      <div className="flex flex-row gap-4 mb-6 justify-center">
        <Link href="/marketplace/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Button>
        </Link>
        <Link href="/wishlist">
          <Button variant="outline">
            <Heart className="mr-2 h-4 w-4" />
            My Wishlist
          </Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <AutoFeatureHandler />
      </Suspense>

      <MarketplaceCategoryNav />

      {error ? (
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/marketplace/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Listing
              </Button>
            </Link>
          </CardFooter>
        </Card>
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
                <Plus className="mr-2 h-4 w-4" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {featuredListings.map(renderListingCard)}
              </div>
            </div>
          )}

          {regularListings.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                {featuredListings.length > 0 ? 'All Listings' : 'Listings'}
              </h2>
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
