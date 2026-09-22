import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/public'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PaymentsUnavailableNotice } from '@/components/dialogs/PaymentsUnavailableNotice'
import {
  FEATURE_DAYS,
  FEATURE_RENEW_WITHIN_DAYS,
} from '@/lib/featured-listings'

const FEATURE_PRICE = 10

interface FeatureListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  listingId: string
}

export function FeatureCreditDialog({
  open,
  onOpenChange,
  listingId,
}: FeatureListingDialogProps) {
  const [isRenewal, setIsRenewal] = useState(false)
  const [alreadyFeatured, setAlreadyFeatured] = useState(false)

  useEffect(() => {
    const checkFeatureStatus = async () => {
      try {
        const now = new Date()
        const nowIso = now.toISOString()

        const { data: feature, error: featureError } = await supabase
          .from('featured_listings')
          .select('*')
          .eq('listing_id', listingId)
          .gt('end_date', nowIso)
          .maybeSingle()

        if (featureError) {
          console.error('Error checking feature status:', featureError)
          return
        }

        if (feature) {
          const endDate = new Date(feature.end_date)
          const daysRemaining = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          const canRenew = daysRemaining <= FEATURE_RENEW_WITHIN_DAYS
          setAlreadyFeatured(!canRenew)
          setIsRenewal(canRenew)
        } else {
          setAlreadyFeatured(false)
          setIsRenewal(false)
        }
      } catch (error) {
        console.error('Error checking feature status:', error)
      }
    }

    if (open) {
      checkFeatureStatus()
    }
  }, [open, listingId])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setIsRenewal(false)
      setAlreadyFeatured(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isRenewal ? 'Renew Featured Listing' : 'Feature Your Listing'}
          </DialogTitle>
          <DialogDescription>
            {alreadyFeatured
              ? `This listing is already featured. You can renew when ${FEATURE_RENEW_WITHIN_DAYS} or fewer days remain.`
              : `Feature your listing for €${FEATURE_PRICE} to make it stand out and appear at the top of search results for ${FEATURE_DAYS} days.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <PaymentsUnavailableNotice action="feature your listing" />
          <div className="text-center p-4 bg-muted rounded-md opacity-60">
            <p className="font-semibold text-lg">€{FEATURE_PRICE}.00</p>
            <p className="text-sm text-muted-foreground">
              One-time payment for {FEATURE_DAYS} days of featuring
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" disabled={alreadyFeatured}>
            {alreadyFeatured
              ? 'Already Featured'
              : isRenewal
                ? 'Renew Feature (Unavailable)'
                : 'Purchase Feature (Unavailable)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
