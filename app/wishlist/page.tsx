'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  Package,
  Heart,
  Trash2,
  Eye,
  User,
  Store,
  CheckCircle,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { toast } from 'sonner'
import { BackButton } from '@/components/ui/back-button'
import { LoadingState } from '@/components/ui/loading-state'
import Image from 'next/image'
import { DeleteConfirmationDialog } from '@/components/dialogs'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface WishlistItem {
  id: string
  created_at: string
  listing_id: string
  listings: {
    id: string
    title: string
    description: string
    price: number
    category: string
    subcategory?: string
    calibre?: string
    type: 'firearms' | 'non_firearms'
    thumbnail: string
    status: string
    created_at: string
    seller_id: string
    seller: {
      username: string
      is_seller: boolean
    } | null
  }
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

export default function WishlistPage() {
  const router = useRouter()
  const { session } = useSupabase()
  const queryClient = useQueryClient()
  const userId = session?.user?.id
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [itemToRemove, setItemToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!session?.user) {
      router.push('/login')
      return
    }
  }, [session, router])

  const wishlistQuery = useQuery({
    queryKey: ['wishlist', userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await fetch('/api/wishlist', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load wishlist items')
      const data = await response.json()
      return (data.wishlistItems || []) as WishlistItem[]
    },
  })

  const wishlistItems = useMemo(
    () => wishlistQuery.data ?? [],
    [wishlistQuery.data]
  )

  const removeMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const response = await fetch(
        `/api/wishlist/remove?listingId=${listingId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to remove item')
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
      toast.success('Removed from wishlist')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to remove item')
    },
    onSettled: () => {
      setIsRemoving(false)
      setRemoveDialogOpen(false)
      setItemToRemove(null)
    },
  })

  async function handleRemoveItem(listingId: string) {
    setIsRemoving(true)
    removeMutation.mutate(listingId)
  }

  function confirmRemoveItem(listingId: string) {
    setItemToRemove(listingId)
    setRemoveDialogOpen(true)
  }

  if (wishlistQuery.isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Loading your wishlist..." />
      </PageLayout>
    )
  }

  if (!session?.user) {
    return (
      <PageLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Wishlist Access</CardTitle>
            <CardDescription>
              You need to log in to view your wishlist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <BackButton label="Back to Home" href="/" />
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <BackButton label="Back" href="/marketplace" />
      <PageHeader
        title="My Wishlist"
        description="Compare and manage your saved listings"
        className="mb-4"
      />
      {wishlistQuery.error ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-2">
            <CardTitle className="text-2xl">Failed to load wishlist</CardTitle>
            <CardDescription>Please refresh and try again.</CardDescription>
          </CardContent>
        </Card>
      ) : wishlistItems.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-6">
            <Heart className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <CardTitle className="text-2xl">Your wishlist is empty</CardTitle>
              <CardDescription className="text-lg max-w-md mx-auto">
                Start browsing the marketplace to save items you're interested
                in
              </CardDescription>
            </div>
            <Link href="/marketplace">
              <Button size="lg" className="mt-4">
                <Package className="mr-2 h-5 w-5" />
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">
                    {wishlistItems.length}{' '}
                    {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved
                  </h2>
                  <p className="text-muted-foreground">
                    Total estimated value:{' '}
                    <span className="font-semibold text-primary">
                      {formatPrice(
                        wishlistItems.reduce(
                          (sum, item) => sum + item.listings.price,
                          0
                        )
                      )}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    wishlistItems.forEach(item => {
                      if (itemToRemove !== item.listing_id) {
                        handleRemoveItem(item.listing_id)
                      }
                    })
                  }}
                  disabled={isRemoving}
                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Wishlist Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map(item => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-200 group"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={item.listings.thumbnail}
                    alt={item.listings.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                  />
                  {item.listings.status === 'sold' && (
                    <Badge
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      Sold
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 left-2 bg-background/80 hover:bg-background/90 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={() => confirmRemoveItem(item.listing_id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {item.listings.type === 'firearms' ? (
                      <Image
                        src="/images/pistol-gun-icon.svg"
                        alt="Firearms"
                        width={16}
                        height={16}
                        className="mr-1"
                      />
                    ) : (
                      <Package className="h-4 w-4 mr-1" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(
                        item.listings.category,
                        item.listings.type
                      )}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {item.listings.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.listings.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(item.listings.price)}
                    </span>
                    {item.listings.type === 'firearms' &&
                      item.listings.calibre && (
                        <Badge variant="outline" className="text-xs">
                          {item.listings.calibre}
                        </Badge>
                      )}
                  </div>

                  {/* Seller info */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    {item.listings.seller?.is_seller ? (
                      <Store className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span>{item.listings.seller?.username}</span>
                    {item.listings.seller?.is_seller && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>

                  {/* Added to wishlist date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Added {format(new Date(item.created_at), 'PPP')}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Link
                    href={`/marketplace/listing/${slugify(item.listings.title)}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmRemoveItem(item.listing_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove from Wishlist"
        description="Are you sure you want to remove this item from your wishlist?"
        onConfirm={() => itemToRemove && handleRemoveItem(itemToRemove)}
        confirmLabel="Remove"
        isLoading={isRemoving}
      />
    </PageLayout>
  )
}
