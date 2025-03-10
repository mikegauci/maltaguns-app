"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun as Gun, Package, ArrowLeft, Mail, Phone, Lock, Pencil, Calendar, User, ChevronLeft, ChevronRight, Star, Store, CheckCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { FeatureCreditDialog } from "@/components/feature-credit-dialog"
import { ReportListingDialog } from "@/components/report-listing-dialog"
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AutoFeatureHandler } from "../../auto-feature-handler"
import { toast } from "sonner"

// Default image to use when no images are provided
const DEFAULT_LISTING_IMAGE = "/images/maltaguns-default-img.jpg"

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
    contact_preference?: "email" | "phone" | "both"
  } | null
  images: string[]
  status: string
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
    ammunition: "Ammunition",
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

export default function ListingClient({ listing }: { listing: ListingDetails }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const [showFeatureDialog, setShowFeatureDialog] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isRetailer, setIsRetailer] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)

  // Use the first image from the listing, or the default if none are available
  const images = listing.images.length > 0 ? listing.images : [DEFAULT_LISTING_IMAGE]

  // Function to check if the current user is the owner of the listing
  async function checkOwnership() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        setIsOwner(session.user.id === listing.seller_id)
      } else {
        setIsOwner(false)
      }
    } catch (error) {
      console.error("Error checking ownership:", error)
      setIsOwner(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to check if the listing is featured
  async function checkIfFeatured() {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("featured_listings")
        .select("*")
        .eq("listing_id", listing.id)
        .gt("end_date", now)
        .maybeSingle();

      if (error) {
        console.error("Error checking featured status:", error);
        return;
      }

      setIsFeatured(!!data);
    } catch (error) {
      console.error("Unexpected error checking featured status:", error);
    }
  }

  // Function to check if seller is a retailer
  async function checkIfRetailer() {
    try {
      if (!listing.seller_id) return;
      
      const { data, error } = await supabase
        .from('retailers')
        .select('id')
        .eq('owner_id', listing.seller_id)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is the error code for "no rows returned"
          console.error("Error checking retailer status:", error);
        }
        setIsRetailer(false);
        return;
      }
      
      setIsRetailer(!!data);
    } catch (error) {
      console.error("Error checking retailer status:", error);
      setIsRetailer(false);
    }
  }

  useEffect(() => {
    // Reset image index when listing changes
    setCurrentImageIndex(0)
    
    // Check if the current user is the owner of the listing
    checkOwnership()
    
    // Check if the listing is featured
    checkIfFeatured()
    
    // Check if seller is a retailer
    checkIfRetailer()
    
    // Check for success parameter to show notification
    const success = searchParams.get('success')
    if (success === 'true') {
      // Show success toast
      toast.success("Payment successful!", {
        description: "Your listing is now featured and will appear at the top of search results for 30 days.",
      })
      
      // Clean up the URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
      
      // Refresh listing data
      checkIfFeatured()
    }
  }, [listing.id, listing.seller_id, searchParams])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user.id || null)
        setIsOwner(session?.user.id === listing.seller_id)
      }
    )

    return () => subscription.unsubscribe()
  }, [listing.seller_id])

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Update the handleFeatureListing function
  const handleFeatureListing = () => {
    if (!userId) {
      // Redirect to login page instead of using signIn
      router.push('/login');
      return;
    }
    
    // Open the dialog, making sure we pass the listing ID
    setShowFeatureDialog(true);
  }

  // Add useEffect to check URL params for auto-featuring after checkout
  useEffect(() => {
    // Check if we should auto-feature the listing after checkout success
    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get('success');
    const autoFeature = searchParams.get('autoFeature');
    
    if (success === 'true' && autoFeature === 'true' && userId && !isFeatured) {
      setShowFeatureDialog(true);
    }
    
    // Clean up the URL parameters after processing
    if (success || autoFeature) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [userId, isFeatured]);

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
                onClick={() => router.push(`/marketplace/listing/${slugify(listing.title)}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              
              {!isFeatured && (
                <Button
                  variant="default"
                  onClick={handleFeatureListing}
                >
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
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="object-contain w-full h-full"
                  />
                  {listing.status === 'sold' && (
                    <Badge variant="destructive" className="absolute top-2 right-2">Sold</Badge>
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
                    index === currentImageIndex ? 'border-primary' : 'border-transparent'
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
                <div className="flex items-center gap-2">
                  {listing.type === 'firearms' ? (
                    <Gun className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                  <Badge variant="secondary">
                    {getCategoryLabel(listing.category, listing.type)}
                  </Badge>
                  {listing.subcategory && (
                    <Badge variant="outline">
                      {getSubcategoryLabel(listing.category, listing.subcategory)}
                    </Badge>
                  )}
                  {listing.type === 'firearms' && listing.calibre && (
                    <Badge variant="secondary">
                      {listing.calibre}
                    </Badge>
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
                  <span>Listed on {format(new Date(listing.created_at), 'PPP')}</span>
                </div>

                {/* Description Section */}
                <div className="border-t pt-4">
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
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
                {userId ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{listing.seller?.username}</p>
                      {isRetailer && (
                        <Link href={`/retailers/${listing.seller_id}`}>
                          <Badge className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 cursor-pointer">
                            <CheckCircle className="h-3 w-3" />
                            Verified Retailer
                          </Badge>
                        </Link>
                      )}
                    </div>
                    {listing.seller?.email && (listing.seller?.contact_preference === "email" || listing.seller?.contact_preference === "both" || !listing.seller?.contact_preference) && (
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
                    {listing.seller?.phone && (listing.seller?.contact_preference === "phone" || listing.seller?.contact_preference === "both" || !listing.seller?.contact_preference) && (
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
                    {/* Add Report Listing button */}
                    {!isOwner && <ReportListingDialog listingId={listing.id} />}
                  </>
                ) : (
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
                            <Button variant="outline" className="w-full">Login</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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