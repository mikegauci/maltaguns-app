"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const plans = [
  { 
    id: "1credit", 
    credits: 1, 
    price: 10, 
    description: "Single listing credit",
    paymentLink: "https://buy.stripe.com/test_1credit" // Replace with actual payment link
  },
  { 
    id: "10credits", 
    credits: 10, 
    price: 50, 
    description: "Best value for regular sellers",
    paymentLink: "https://buy.stripe.com/test_10credits" // Replace with actual payment link
  },
  { 
    id: "20credits", 
    credits: 20, 
    price: 100, 
    description: "Perfect for power sellers",
    paymentLink: "https://buy.stripe.com/test_20credits" // Replace with actual payment link
  },
]

interface CreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreditDialog({ open, onOpenChange, onSuccess }: CreditDialogProps) {
  const { toast } = useToast()

  const handlePurchase = (paymentLink: string) => {
    window.location.href = paymentLink
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Purchase Credits</DialogTitle>
          <DialogDescription>
            Choose a credit package to start creating listings
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-4 flex flex-col">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{plan.credits} Credit{plan.credits > 1 ? "s" : ""}</h3>
                <p className="text-2xl font-bold mb-2">€{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <Button
                className="mt-4"
                onClick={() => handlePurchase(plan.paymentLink)}
              >
                Purchase
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}