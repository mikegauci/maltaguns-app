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
import { useRouter } from 'next/navigation'
import { PaymentsUnavailableNotice } from '@/components/dialogs/PaymentsUnavailableNotice'

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
    price: 60,
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
  userId?: string
  source?: 'profile' | 'marketplace'
}

export function CreditDialog({
  open,
  onOpenChange,
  source,
}: CreditDialogProps) {
  const router = useRouter()

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
        <PaymentsUnavailableNotice action="purchase credits" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map(plan => (
            <Card key={plan.id} className="p-4 flex flex-col opacity-60">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {plan.credits} Credit{plan.credits > 1 ? 's' : ''}
                </h3>
                <p className="text-2xl font-bold mb-2">€{plan.price}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <Button className="mt-4" disabled>
                Unavailable
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
