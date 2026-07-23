'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FEATURE_DAYS } from '@/lib/featured-listings'

interface AutoFeatureHandlerProps {
  listingId?: string
  onFeatured?: () => void
}

export function AutoFeatureHandler({
  listingId,
  onFeatured,
}: AutoFeatureHandlerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    const processFeature = async () => {
      // Only process once
      if (processed) return

      // Check if this is a success return from payment
      const success = searchParams.get('success')
      const targetId = listingId || searchParams.get('listingId')

      if (success === 'true' && targetId) {
        try {
          console.log('Auto-featuring after payment success')
          setProcessed(true)

          // Get the current user
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()
          if (authError) throw authError

          if (!user) {
            console.error('No user found for auto-featuring')
            toast.error(
              'Please sign in to finish applying your featured listing'
            )
            return
          }

          // Always call the auto-feature API. It verifies the Stripe payment and
          // applies or renews the feature (or confirms the webhook already did),
          // so we never report success without the period actually being set.
          const response = await fetch('/api/listings/auto-feature', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              listingId: targetId,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to auto-feature listing')
          }

          const data = await response.json()

          if (data.success) {
            toast.success(
              data.alreadyFeatured
                ? 'Your listing was already featured!'
                : 'Your listing is now featured!',
              {
                description: `It will appear at the top of search results for ${FEATURE_DAYS} days.`,
              }
            )
            onFeatured?.()

            // Clean the URL parameters
            const currentPath = window.location.pathname
            router.replace(currentPath)
          }
        } catch (error) {
          console.error('Error auto-featuring listing:', error)
          toast.error('Failed to apply feature to your listing', {
            description:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred',
          })
        }
      }
    }

    processFeature()
  }, [searchParams, processed, router, listingId, onFeatured])

  // This component doesn't render anything visible
  return null
}
