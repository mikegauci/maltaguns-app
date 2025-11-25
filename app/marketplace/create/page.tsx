'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Package } from 'lucide-react'
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
import Image from 'next/image'

// Import custom hooks and handlers
import { useSellerStatus } from './hooks/useSellerStatus'
import { createNavigationHandlers } from './handlers/navigationHandlers'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

export default function CreateListing() {
  const router = useRouter()
  const [showLicenseDialog, setShowLicenseDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState({
    title: 'Verification Required',
    description:
      'To sell firearms on Maltaguns, you must verify your account. Please go to your profile to complete verification.',
  })

  // Use custom hook for seller status checking
  const {
    isLoading,
    isSeller,
    isVerified,
    isIdCardVerified,
    hasLicense,
    hasIdCard,
  } = useSellerStatus()

  // Create navigation handlers
  const { handleFirearmsClick, handleNonFirearmsClick, handleGoToProfile } =
    createNavigationHandlers({
      router,
      isSeller,
      isVerified,
      isIdCardVerified,
      hasLicense,
      hasIdCard,
      setShowLicenseDialog,
      setDialogMessage,
    })

  if (isLoading) {
    return (
      <PageLayout centered>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout containerSize="md" padding="md">
      <PageHeader
        title="Create Listing"
        description="Choose the type of listing you want to create"
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="hover:border-primary/50 cursor-pointer transition-colors"
          onClick={handleFirearmsClick}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="/images/pistol-gun-icon.svg"
                alt="Firearms"
                width={20}
                height={20}
              />
              Firearms Listing
            </CardTitle>
            <CardDescription>
              Create a listing for firearms, including airguns, pistols, rifles,
              and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For licensed sellers only. Verification required.
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/50 cursor-pointer transition-colors"
          onClick={handleNonFirearmsClick}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Non-Firearms Listing
            </CardTitle>
            <CardDescription>
              Create a listing for accessories, equipment, and related items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Open to all verified sellers. Includes airsoft, reloading
              equipment, and accessories.
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToProfile}>
              Go to Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
