'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const { session } = useSupabase()

  const checkWishlistStatus = useCallback(async () => {
    if (!session?.user) {
      setIsCheckingStatus(false)
      return
    }

    try {
      const response = await fetch('/api/wishlist')
      if (response.ok) {
        const data = await response.json()
        const isWishlisted = data.wishlistItems?.some(
          (item: { listing_id: string }) => item.listing_id === listingId
        )
        setIsInWishlist(isWishlisted)
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [session?.user, listingId])

  useEffect(() => {
    checkWishlistStatus()
  }, [checkWishlistStatus])

  async function handleWishlistToggle() {
    if (!session?.user) {
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
          setIsInWishlist(false)
          toast.success('Removed from wishlist')
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to remove from wishlist')
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
          setIsInWishlist(true)
          toast.success('Added to wishlist')
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to add to wishlist')
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session?.user || isCheckingStatus) {
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
