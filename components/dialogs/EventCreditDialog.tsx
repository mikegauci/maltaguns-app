'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { startCheckout } from '@/lib/start-checkout'

interface EventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function EventCreditDialog({
  open,
  onOpenChange,
}: EventCreditDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      await startCheckout({ product: 'eventCredit' })
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

  const handleBack = () => {
    router.back()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Purchase Event Credits</DialogTitle>
          <DialogDescription>
            Purchase credits to create events on MaltaGuns
          </DialogDescription>
        </DialogHeader>
        <Card className="p-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">1 Event Credit</h3>
            <p className="text-2xl font-bold mb-2">€25</p>
            <p className="text-sm text-muted-foreground">
              Create one event on MaltaGuns
            </p>
          </div>
          <Button
            className="w-full mt-4"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Redirecting...' : 'Purchase'}
          </Button>
        </Card>
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full border-black text-black hover:bg-gray-100"
          >
            Go Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
