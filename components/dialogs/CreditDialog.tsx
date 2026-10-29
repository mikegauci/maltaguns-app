'use client'

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
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { startCheckout } from '@/lib/start-checkout'
import {
  PAYMENT_PRODUCTS,
  type PaymentProductKey,
} from '@/lib/payment-products'

interface Plan {
  id: PaymentProductKey
  description: string
}

const plans: Plan[] = [
  { id: 'credit1', description: 'Single listing credit' },
  { id: 'credit5', description: 'Best value for regular sellers' },
  { id: 'credit10', description: 'Perfect for collection liquidation' },
]

interface CreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  source?: 'profile' | 'marketplace'
}

export function CreditDialog({
  open,
  onOpenChange,
  source,
}: CreditDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<PaymentProductKey | null>(null)

  const handlePurchase = async (product: PaymentProductKey) => {
    setLoadingPlan(product)
    try {
      await startCheckout({ product, source })
    } catch (error) {
      setLoadingPlan(null)
      toast({
        title: 'Could not start checkout',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleBack = () => {
    if (source === 'profile') {
      onOpenChange(false)
    } else if (source === 'marketplace') {
      router.push('/marketplace/create')
      onOpenChange(false)
    } else {
      onOpenChange(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen && source === 'marketplace') {
      router.push('/marketplace/create')
    }
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
          {plans.map(plan => {
            const { credits, priceCents } = PAYMENT_PRODUCTS[plan.id]
            return (
              <Card key={plan.id} className="p-4 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {credits} Credit{credits > 1 ? 's' : ''}
                  </h3>
                  <p className="text-2xl font-bold mb-2">€{priceCents / 100}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <Button
                  className="mt-4"
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loadingPlan === plan.id ? 'Redirecting...' : 'Purchase'}
                </Button>
              </Card>
            )
          })}
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
