'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  fetchWishlistItems,
  invalidateWishlist,
  setListingWishlistedInCache,
  wishlistQueryKey,
} from '@/lib/wishlist-query'

interface WishlistButtonProps {
  listingId: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showText?: boolean
}

export function WishlistButton({
  listingId,
  className,
  size = 'default',
  variant = 'outline',
  showText = false,
}: WishlistButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { session, isLoading: authLoading } = useSupabase()
  const queryClient = useQueryClient()
  const userId = session?.user?.id

  const wishlistQuery = useQuery({
    queryKey: userId ? wishlistQueryKey(userId) : ['wishlist'],
    enabled: !!userId && !authLoading,
    queryFn: fetchWishlistItems,
    staleTime: 60_000,
  })

  const isInWishlist =
    wishlistQuery.data?.some(item => item.listing_id === listingId) ?? false

  async function handleWishlistToggle() {
    if (!userId) {
      return
    }

    setIsLoading(true)

    try {
      if (isInWishlist) {
        const response = await fetch(
          `/api/wishlist/remove?listingId=${listingId}`,
          {
            method: 'DELETE',
          }
        )

        if (response.ok) {
          setListingWishlistedInCache(queryClient, userId, listingId, false)
          invalidateWishlist(queryClient, userId)
          toast.success('Removed from wishlist')
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to remove from wishlist')
          invalidateWishlist(queryClient, userId)
        }
      } else {
        const response = await fetch('/api/wishlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listingId }),
        })

        if (response.ok) {
          setListingWishlistedInCache(queryClient, userId, listingId, true)
          invalidateWishlist(queryClient, userId)
          toast.success('Added to wishlist')
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to add to wishlist')
          invalidateWishlist(queryClient, userId)
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error)
      toast.error('Something went wrong')
      invalidateWishlist(queryClient, userId)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || !userId || wishlistQuery.isLoading) {
    return null
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWishlistToggle}
      disabled={isLoading}
      className={cn(
        'gap-2',
        isInWishlist &&
          'text-red-600 border-red-200 bg-red-50 hover:bg-red-100',
        className
      )}
    >
      <Heart
        className={cn('h-4 w-4', isInWishlist && 'fill-current text-red-600')}
      />
      {showText && (
        <span>
          {isLoading
            ? '...'
            : isInWishlist
              ? 'Remove from Wishlist'
              : 'Add to Wishlist'}
        </span>
      )}
    </Button>
  )
}
