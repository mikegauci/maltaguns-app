'use client'

import { useQuery } from '@tanstack/react-query'
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
import { AutoFeatureHandler } from './auto-feature-handler'
import { LoadingState } from '@/components/ui/loading-state'
import Image from 'next/image'
import { WishlistButton } from '@/components/marketplace/WishlistButton'
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

async function fetchMarketplaceData(): Promise<{
  featuredListings: Listing[]
  regularListings: Listing[]
}> {
  const res = await fetch('/api/public/marketplace')
  if (!res.ok) throw new Error('Failed to load listings')
  return res.json()
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

export default function Marketplace() {
  const query = useQuery({
    queryKey: ['public-marketplace'],
    queryFn: fetchMarketplaceData,
  })

  const featuredListings = query.data?.featuredListings ?? []
  const regularListings = query.data?.regularListings ?? []
  const error = query.error ? 'Failed to load listings' : null

  // Function to render a listing card
  const renderListingCard = (listing: Listing) => (
    <Link
      key={listing.id}
      href={`/marketplace/listing/${slugify(listing.title)}`}
    >
      <Card
        className={`overflow-hidden hover:shadow-lg transition-shadow ${
          listing.is_featured ? 'border-2 border-red-500' : ''
        }`}
      >
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
          {listing.is_featured && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
          <div
            className="absolute bottom-2 right-2"
            onClick={e => e.preventDefault()}
          >
            <WishlistButton
              listingId={listing.id}
              size="sm"
              variant="ghost"
              className="bg-background/80 hover:bg-background/90"
            />
          </div>
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
            <Link
              href={`/marketplace/${
                listing.type === 'firearms' ? 'firearms' : 'non-firearms'
              }/${listing.category}`}
              onClick={e => e.stopPropagation()}
            >
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer"
              >
                {getCategoryLabel(listing.category, listing.type)}
              </Badge>
            </Link>
          </div>
          <h3 className="text-md font-semibold mb-2 line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
            {listing.description}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{formatPrice(listing.price)}</p>
            {listing.type === 'firearms' && listing.calibre && (
              <Badge variant="secondary">{listing.calibre}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  // Category navigation data
  const categories = [
    {
      title: 'Firearms',
      icon: (
        <Image
          src="/images/pistol-gun-icon.svg"
          alt="Firearms"
          width={20}
          height={20}
        />
      ),
      href: '/marketplace/firearms',
      subcategories: [
        { name: 'Airguns', href: '/marketplace/firearms/airguns' },
        { name: 'Ammunition', href: '/marketplace/firearms/ammunition' },
        { name: 'Black Powder', href: '/marketplace/firearms/black-powder' },
        { name: 'Carbines', href: '/marketplace/firearms/carbines' },
        { name: 'Crossbow', href: '/marketplace/firearms/crossbow' },
        { name: 'Pistols', href: '/marketplace/firearms/pistols' },
        {
          name: 'Replica/Deactivated',
          href: '/marketplace/firearms/replica-deactivated',
        },
        { name: 'Revolvers', href: '/marketplace/firearms/revolvers' },
        { name: 'Rifles', href: '/marketplace/firearms/rifles' },
        { name: 'Schedule 1', href: '/marketplace/firearms/schedule-1' },
        { name: 'Shotguns', href: '/marketplace/firearms/shotguns' },
      ],
    },
    {
      title: 'Non-Firearms',
      icon: <Package className="h-5 w-5" />,
      href: '/marketplace/non-firearms',
      subcategories: [
        { name: 'Airsoft', href: '/marketplace/non-firearms/airsoft' },
        { name: 'Reloading', href: '/marketplace/non-firearms/reloading' },
        { name: 'Militaria', href: '/marketplace/non-firearms/militaria' },
        { name: 'Accessories', href: '/marketplace/non-firearms/accessories' },
      ],
    },
  ]

  if (query.isLoading) {
    return (
      <PageLayout>
        <LoadingState />
      </PageLayout>
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

      {/* Add the AutoFeatureHandler with no specific listingId */}
      <AutoFeatureHandler />

      {/* Category Navigation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {categories.map(category => (
          <Card key={category.title} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {category.icon}
                <Link href={category.href} className="hover:underline">
                  {category.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {category.subcategories.map(subcategory => (
                  <Link
                    key={subcategory.name}
                    href={subcategory.href}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    {subcategory.name}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/marketplace/create">
              <Button>
                <Image
                  src="/images/pistol-gun-icon.svg"
                  alt="Firearms"
                  width={16}
                  height={16}
                  className="mr-2"
                />
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
                <Image
                  src="/images/pistol-gun-icon.svg"
                  alt="Firearms"
                  width={16}
                  height={16}
                  className="mr-2"
                />
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {featuredListings.map(renderListingCard)}
              </div>
            </div>
          )}

          {regularListings.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                {featuredListings.length > 0 ? 'All Listings' : 'Listings'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {regularListings.map(renderListingCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
