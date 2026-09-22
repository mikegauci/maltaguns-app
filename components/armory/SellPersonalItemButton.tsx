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
import { useSellerStatus } from '@/app/marketplace/create/hooks/useSellerStatus'
import { useCredits } from '@/app/marketplace/create/hooks/useCredits'
import { useAuthSession } from '@/app/marketplace/create/hooks/useAuthSession'
import {
  getFirearmsSellGateMessage,
  type FirearmsSellGateMessage,
} from '@/app/marketplace/create/handlers/navigationHandlers'

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
}

export function SellPersonalItemButton({ item }: SellPersonalItemButtonProps) {
  const router = useRouter()
  const { isLoading, isSeller, isVerified, isIdentityVerified, hasLicense } =
    useSellerStatus()
  const { credits, checkCredits } = useCredits()
  const { userId, isRetailer } = useAuthSession()
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState<FirearmsSellGateMessage>({
    title: 'Verification Required',
    description:
      'To sell firearms on Maltaguns, you must verify your account. Please go to your profile to complete verification.',
  })
  const isFirearm = item.item_type === 'FIREARM'
  const isBusy = isLoading

  function navigateToCreate() {
    const base = isFirearm
      ? '/marketplace/create/firearms'
      : '/marketplace/create/non-firearms'
    router.push(`${base}?inventoryItem=${item.id}`)
  }

  async function handleSell() {
    if (isBusy) return

    if (!isFirearm) {
      navigateToCreate()
      return
    }

    const gate = getFirearmsSellGateMessage({
      isSeller,
      isVerified,
      isIdentityVerified,
      hasLicense,
    })
    if (gate) {
      setDialogMessage(gate)
      setShowVerifyDialog(true)
      return
    }

    const currentCredits = (await checkCredits(isRetailer)) ?? credits
    if (currentCredits < 1 && !isRetailer) {
      setShowCreditDialog(true)
      return
    }

    navigateToCreate()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        disabled={isBusy}
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

      {userId && showCreditDialog && (
        <CreditDialog
          open={showCreditDialog}
          onOpenChange={setShowCreditDialog}
          userId={userId}
          source="marketplace"
        />
      )}
    </>
  )
}
