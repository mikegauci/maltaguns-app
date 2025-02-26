"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun as Gun, Package, ArrowLeft, Mail, Phone, Lock, Pencil, Calendar, User, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  }
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

export default function ListingClient({ listing }: { listing: ListingDetails }) {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<string>(listing.thumbnail)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const allImages = [listing.thumbnail, ...listing.images].filter(Boolean)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setIsOwner(session?.user.id === listing.seller_id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      setIsOwner(session?.user.id === listing.seller_id)
    })

    return () => subscription.unsubscribe()
  }, [listing.seller_id])

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
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
            <Button
              variant="outline"
              onClick={() => router.push(`/marketplace/listing/${listing.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Listing
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Section (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Images Section */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={allImages[currentImageIndex]}
                    alt={listing.title}
                    className="object-contain w-full h-full"
                  />
                  {listing.status === 'sold' && (
                    <Badge variant="destructive" className="absolute top-2 right-2">Sold</Badge>
                  )}
                  {allImages.length > 1 && (
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
              {allImages.map((image, index) => (
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
                {isAuthenticated ? (
                  <>
                    <p className="font-semibold">{listing.seller.username}</p>
                    {listing.seller.email && (
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
                    {listing.seller.phone && (
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
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
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
                      <div className="inset-0 flex flex-col items-center justify-center bg-background/80">
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
    </div>
  )
}