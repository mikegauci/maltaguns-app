'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'

// Initialize Stripe with your publishable key.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface Plan {
  id: string
  credits: number
  price: number
  description: string
}

const plans: Plan[] = [
  {
    id: 'price_1credit',
    credits: 1,
    price: 15,
    description: 'Single listing credit',
  },
  {
    id: 'price_5credits',
    credits: 5,
    price: 65,
    description: 'Best value for regular sellers',
  },
  {
    id: 'price_10credits',
    credits: 10,
    price: 100,
    description: 'Perfect for collection liquidation',
  },
]

interface CreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSuccess?: () => void
  source?: 'profile' | 'marketplace'
}

export function CreditDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
  source,
}: CreditDialogProps) {
  const router = useRouter()
  useEffect(() => {
    void stripePromise
  }, [])

  const handlePurchase = async (priceId: string) => {
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Error response from server: ${errorText}`)
      }

      const data = await res.json()
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe failed to load')
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })
      if (error) console.error('Stripe checkout error:', error)
    } catch (error) {
      console.error('Payment error:', error)
    }
  }

  const handleBack = () => {
    if (source === 'profile') {
      // Just close the dialog if opened from profile
      onOpenChange(false)
    } else if (source === 'marketplace') {
      // Return to marketplace create page
      router.push('/marketplace/create')
      onOpenChange(false)
    } else {
      // Default behavior - just close
      onOpenChange(false)
    }
  }

  // Prevent closing the dialog when clicking outside or pressing escape
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow the dialog to be closed programmatically through our buttons
    if (newOpen === false) {
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle>Purchase Credits</DialogTitle>
          <DialogDescription>
            Choose a credit package to start creating listings
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map(plan => (
            <Card key={plan.id} className="p-4 flex flex-col">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {plan.credits} Credit{plan.credits > 1 ? 's' : ''}
                </h3>
                <p className="text-2xl font-bold mb-2">€{plan.price}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <Button className="mt-4" onClick={() => handlePurchase(plan.id)}>
                Purchase
              </Button>
            </Card>
          ))}
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleBack} className="w-full">
            Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
