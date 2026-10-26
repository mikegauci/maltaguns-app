'use client'

import { useState } from 'react'
import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSellEligibility } from '@/app/marketplace/create/hooks/useSellEligibility'
import {
  getFirearmsSellGateMessage,
  type FirearmsSellGateMessage,
} from '@/app/marketplace/create/handlers/navigationHandlers'
import { useToast } from '@/hooks/use-toast'

const CreditDialog = nextDynamic(
  () => import('@/components/dialogs/CreditDialog').then(m => m.CreditDialog),
  { ssr: false }
)

type SellPersonalItem = {
  id: string
  item_type: string
}

type SellPersonalItemButtonProps = {
  item: SellPersonalItem
  returnTo: string
}

export function SellPersonalItemButton({
  item,
  returnTo,
}: SellPersonalItemButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { refreshEligibility } = useSellEligibility()
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [creditUserId, setCreditUserId] = useState<string | null>(null)
  const [isHandling, setIsHandling] = useState(false)
  const [dialogMessage, setDialogMessage] = useState<FirearmsSellGateMessage>({
    title: 'Verification Required',
    description:
      'To sell firearms on Maltaguns, you must verify your account. Please go to your profile to complete verification.',
  })
  const isFirearm = item.item_type === 'FIREARM'

  function navigateToCreate() {
    const base = isFirearm
      ? '/marketplace/create/firearms'
      : '/marketplace/create/non-firearms'
    const params = new URLSearchParams()
    params.set('inventoryItem', item.id)
    params.set('returnTo', returnTo)
    router.push(`${base}?${params.toString()}`)
  }

  async function handleSell() {
    if (isHandling) return

    if (!isFirearm) {
      navigateToCreate()
      return
    }

    setIsHandling(true)
    try {
      const ready = await refreshEligibility()

      const gate = getFirearmsSellGateMessage({
        isSeller: ready.isSeller,
        isVerified: ready.isVerified,
        isIdentityVerified: ready.isIdentityVerified,
        hasLicense: ready.hasLicense,
      })
      if (gate) {
        setDialogMessage(gate)
        setShowVerifyDialog(true)
        return
      }

      if (ready.credits < 1 && !ready.isRetailer) {
        setCreditUserId(ready.userId)
        setShowCreditDialog(true)
        return
      }

      navigateToCreate()
    } catch {
      toast({
        title: 'Unable to start listing',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setIsHandling(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        disabled={isHandling}
        onClick={handleSell}
      >
        Sell
      </Button>

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/profile')}>
              Go to Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {creditUserId && showCreditDialog && (
        <CreditDialog
          open={showCreditDialog}
          onOpenChange={setShowCreditDialog}
          userId={creditUserId}
          source="marketplace"
        />
      )}
    </>
  )
}
