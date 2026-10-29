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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { startCheckout } from '@/lib/start-checkout'
import { PAYMENT_PRODUCTS } from '@/lib/payment-products'
import {
  FEATURE_DAYS,
  FEATURE_RENEW_WITHIN_DAYS,
} from '@/lib/featured-listings'

const FEATURE_PRICE = PAYMENT_PRODUCTS.featuredListing.priceCents / 100

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
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isRenewal, setIsRenewal] = useState(false)
  const [alreadyFeatured, setAlreadyFeatured] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      await startCheckout({ product: 'featuredListing', listingId })
    } catch (error) {
      setLoading(false)
      toast({
        title: 'Could not start checkout',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

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
    if (loading) return
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
          <div className="text-center p-4 bg-muted rounded-md">
            <p className="font-semibold text-lg">€{FEATURE_PRICE}.00</p>
            <p className="text-sm text-muted-foreground">
              One-time payment for {FEATURE_DAYS} days of featuring
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handlePurchase}
            disabled={loading || alreadyFeatured}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading
              ? 'Redirecting...'
              : alreadyFeatured
                ? 'Already Featured'
                : isRenewal
                  ? `Renew Feature (€${FEATURE_PRICE})`
                  : `Purchase Feature (€${FEATURE_PRICE})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
