'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  ArrowLeft,
  Mail,
  Phone,
  Lock,
  Pencil,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Star,
  Store,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSupabase } from '@/components/providers/supabase-provider'
import { FeatureCreditDialog } from '@/components/feature-credit-dialog'
import { ReportListingDialog } from '@/components/report-listing-dialog'
import { AutoFeatureHandler } from '../../auto-feature-handler'
import { toast } from 'sonner'
import { LoadingState } from '@/components/ui/loading-state'
import Image from 'next/image'
import { WishlistButton } from '@/components/wishlist-button'

// Default image to use when no images are provided
const DEFAULT_LISTING_IMAGE = '/images/maltaguns-default-img.jpg'

interface ListingDetails {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  seller_id: string
  created_at: string
  seller: {
    username: string
    email: string | null
    phone: string | null
    contact_preference?: 'email' | 'phone' | 'both'
  } | null
  images: string[]
  status: string
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

function getSubcategoryLabel(category: string, subcategory: string): string {
  const subcategories = {
    airsoft: {
      airsoft_guns: 'Airsoft Guns',
      bbs_co2: 'BBs & CO2',
      batteries_electronics: 'Batteries & Electronics',
      clothing: 'Clothing',
      other: 'Other',
    },
    reloading: {
      presses: 'Presses',
      dies: 'Dies',
      tools: 'Tools',
      tumblers_media: 'Tumblers & Media',
      primers_heads: 'Primers & Heads',
      other: 'Other',
    },
    militaria: {
      uniforms: 'Uniforms',
      helmets: 'Helmets',
      swords_bayonets_knives: 'Swords, Bayonets & Knives',
      medals_badges: 'Medals & Badges',
      other: 'Other',
    },
    accessories: {
      cleaning_maintenance: 'Cleaning & Maintenance',
      bipods_stands: 'Bipods & Stands',
      slings_holsters: 'Slings & Holsters',
      scopes_sights_optics: 'Scopes, Sights & Optics',
      magazines: 'Magazines',
      books_manuals: 'Books & Manuals',
      hunting_equipment: 'Hunting Equipment',
      safes_cabinets: 'Safes & Cabinets',
      ammo_boxes: 'Ammo Boxes',
      gun_cases: 'Gun Cases',
      safety_equipment: 'Safety Equipment',
      grips: 'Grips',
      other: 'Other',
    },
  } as const

  if (!(category in subcategories)) {
    return subcategory
  }

  const categorySubcategories =
    subcategories[category as keyof typeof subcategories]
  return (
    categorySubcategories[subcategory as keyof typeof categorySubcategories] ||
    subcategory
  )
}

export default function ListingClient({
  listing,
}: {
  listing: ListingDetails
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { supabase, session } = useSupabase()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const [showFeatureDialog, setShowFeatureDialog] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isRetailer, setIsRetailer] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isSellerVerified, setIsSellerVerified] = useState(false)

  // Use the first image from the listing, or the default if none are available
  const images =
    listing.images.length > 0 ? listing.images : [DEFAULT_LISTING_IMAGE]

  // Function to check if the current user is the owner of the listing
  async function checkOwnership() {
    try {
      console.log('Checking session...')

      if (session?.user) {
        console.log('Session found:', {
          userId: session.user.id,
          listingSellerId: listing.seller_id,
        })

        setUserId(session.user.id)
        setIsOwner(session.user.id === listing.seller_id)
        setSessionChecked(true)
        return session
      }

      console.log('No session found')
      setUserId(null)
      setIsOwner(false)
      setSessionChecked(true)
      return null
    } catch (error) {
      console.error('Error checking ownership:', error)
      setUserId(null)
      setIsOwner(false)
      setSessionChecked(true)
      return null
    }
  }

  // Function to check if the listing is featured
  async function checkIfFeatured() {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('featured_listings')
        .select('*')
        .eq('listing_id', listing.id)
        .gt('end_date', now)
        .maybeSingle()

      if (error) {
        console.error('Error checking featured status:', error)
        return
      }

      setIsFeatured(!!data)
    } catch (error) {
      console.error('Unexpected error checking featured status:', error)
    }
  }

  // Function to check if seller is a retailer
  async function checkIfRetailer() {
    if (!listing.seller_id) return

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', listing.seller_id)
        .limit(1)

      if (error) {
        console.error('Error checking store status:', error)
        setIsRetailer(false)
        return
      }

      setIsRetailer(!!data?.[0])
    } catch (error) {
      console.error('Error checking store status:', error)
      setIsRetailer(false)
    }
  }

  // Function to check if seller is verified
  async function checkIfSellerVerified() {
    if (!listing.seller_id) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_seller')
        .eq('id', listing.seller_id)
        .single()

      if (error) {
        console.error('Error checking seller verification status:', error)
        setIsSellerVerified(false)
        return
      }

      setIsSellerVerified(!!data?.is_seller)
    } catch (error) {
      console.error('Error checking seller verification status:', error)
      setIsSellerVerified(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function initializeData() {
      try {
        setIsLoading(true)

        // First check session and ownership
        const currentSession = await checkOwnership()
        console.log('Initial session check complete:', {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id,
        })

        // If we're not logged in, we can skip other checks
        if (!currentSession) {
          if (mounted) {
            setIsLoading(false)
          }
          return
        }

        // Run remaining checks in parallel only if we have a session
        if (mounted) {
          await Promise.all([
            checkIfFeatured(),
            checkIfRetailer(),
            checkIfSellerVerified(),
          ])
        }

        if (mounted) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error initializing data:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Initialize data when session changes
    initializeData()

    // Set a timeout to show loading state if initialization takes too long
    timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.log('Loading timeout reached, forcing state update')
        setIsLoading(false)
        setSessionChecked(true)
      }
    }, 3000) // 3 seconds timeout

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [session, listing.id, listing.seller_id])

  // Remove duplicate auth state listener
  useEffect(() => {
    console.log('Current user state:', { userId, isOwner })
  }, [userId, isOwner])

  // Render debug info in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Component state:', {
        userId,
        isOwner,
        isLoading,
        sessionChecked,
        hasSellerInfo: !!listing.seller,
      })
    }
  }, [userId, isOwner, isLoading, sessionChecked, listing.seller])

  function handleFeatureListing() {
    if (!userId) {
      router.push('/login')
      return
    }
    setShowFeatureDialog(true)
  }

  function prevImage() {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }

  function nextImage() {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }

  if (isLoading && !sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading listing details..." />
      </div>
    )
  }

  // Render seller information section
  const renderSellerInfo = () => {
    console.log('Rendering seller info with state:', {
      userId,
      sessionChecked,
      hasSellerInfo: !!listing.seller,
      sellerInfo: listing.seller,
    })

    // Show loading state while checking session
    if (!sessionChecked) {
      return (
        <div className="flex items-center justify-center p-4">
          <LoadingState message="Loading seller information..." />
        </div>
      )
    }

    // Show seller information for authenticated users
    if (userId && listing.seller) {
      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            {isRetailer ? (
              <Store className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isRetailer ? 'Enterprise' : 'Individual'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{listing.seller.username}</p>
            {isSellerVerified && (
              <Badge className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified Gun Seller
              </Badge>
            )}
          </div>

          {listing.seller.email &&
            (listing.seller.contact_preference === 'email' ||
              listing.seller.contact_preference === 'both' ||
              !listing.seller.contact_preference) && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${listing.seller.email}`}
                  className="text-primary hover:underline"
                >
                  {listing.seller.email}
                </a>
              </div>
            )}
          {listing.seller.phone &&
            (listing.seller.contact_preference === 'phone' ||
              listing.seller.contact_preference === 'both' ||
              !listing.seller.contact_preference) && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${listing.seller.phone}`}
                  className="text-primary hover:underline"
                >
                  {listing.seller.phone}
                </a>
              </div>
            )}

          {/* Add Wishlist Button for non-owners */}
          {!isOwner && (
            <div className="mt-4 pt-4 border-t">
              <WishlistButton
                listingId={listing.id}
                showText={true}
                variant="outline"
                className="w-full"
              />
            </div>
          )}

          {!isOwner && <ReportListingDialog listingId={listing.id} />}
        </>
      )
    }

    // Show login/register prompt if not authenticated
    return (
      <div className="space-y-4">
        <div className="relative min-h-[200px]">
          <div className="blur-sm">
            <p className="font-semibold">••••••••••</p>
            <div className="flex items-center gap-2 mt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>••••••@••••.com</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>+356 •••• ••••</span>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4">
            <Lock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-center text-muted-foreground mb-4">
              Create a verified account to view seller information
            </p>
            <div className="flex flex-col gap-2 w-full">
              <Link href="/register" className="w-full">
                <Button className="w-full">Register to Contact Seller</Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/marketplace')}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to marketplace
          </Button>

          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() =>
                  router.push(
                    `/marketplace/listing/${slugify(listing.title)}/edit`
                  )
                }
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>

              {!isFeatured && (
                <Button variant="default" onClick={handleFeatureListing}>
                  <Star className="h-4 w-4 mr-2" />
                  Feature Listing
                </Button>
              )}

              {isFeatured && (
                <Badge className="flex items-center px-3 py-1 bg-red-500 text-white hover:bg-red-600">
                  <Star className="h-4 w-4 mr-2" />
                  Featured
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Feature Credit Dialog */}
        {userId && (
          <FeatureCreditDialog
            open={showFeatureDialog}
            onOpenChange={setShowFeatureDialog}
            userId={userId}
            listingId={listing.id}
            onSuccess={() => {
              setIsFeatured(true)
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Section (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Images Section */}
            <Card>
              <CardContent className="p-2">
                <div className="relative h-[500px] flex items-center justify-center">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="object-contain w-full h-full max-h-[500px]"
                  />
                  {listing.status === 'sold' && (
                    <Badge
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      Sold
                    </Badge>
                  )}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-6 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`aspect-video cursor-pointer overflow-hidden rounded-lg border-2 ${
                    index === currentImageIndex
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={image}
                    alt={`${listing.title} - Image ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>

            {/* Details Section */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  {listing.type === 'firearms' ? (
                    <Image
                      src="/images/pistol-gun-icon.svg"
                      alt="Firearms"
                      width={20}
                      height={20}
                      className="mr-2"
                    />
                  ) : (
                    <Package className="h-5 w-5 mr-2" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {listing.type === 'firearms' ? 'Firearms' : 'Non-Firearms'}{' '}
                    Listing
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getCategoryLabel(listing.category, listing.type)}
                  </Badge>
                  {listing.subcategory && (
                    <Badge variant="outline">
                      {getSubcategoryLabel(
                        listing.category,
                        listing.subcategory
                      )}
                    </Badge>
                  )}
                  {listing.type === 'firearms' && listing.calibre && (
                    <Badge variant="secondary">{listing.calibre}</Badge>
                  )}
                </div>

                <div>
                  <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(listing.price)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Listed on {format(new Date(listing.created_at), 'PPP')}
                  </span>
                </div>

                {/* Description Section */}
                <div className="border-t pt-4">
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-gray-700 whitespace-pre-line">
                    {listing.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seller Information Section (1 column) */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderSellerInfo()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add the AutoFeatureHandler with the specific listing ID */}
      <AutoFeatureHandler listingId={listing.id} />
    </div>
  )
}
