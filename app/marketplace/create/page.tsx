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

export default function CreateListing() {
  const router = useRouter()
  const [showLicenseDialog, setShowLicenseDialog] = useState(false)

  // Use custom hook for seller status checking
  const { isLoading, isSeller } = useSellerStatus()

  // Create navigation handlers
  const { handleFirearmsClick, handleNonFirearmsClick, handleGoToProfile } =
    createNavigationHandlers({
      router,
      isSeller,
      setShowLicenseDialog,
    })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Listing</h1>
        <p className="text-muted-foreground mb-8">
          Choose the type of listing you want to create
        </p>

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
                Create a listing for firearms, including airguns, pistols,
                rifles, and more
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

        <AlertDialog
          open={showLicenseDialog}
          onOpenChange={setShowLicenseDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>License upload required</AlertDialogTitle>
              <AlertDialogDescription>
                To sell firearms on Maltaguns, we must first verify that you are
                infact licensed. please upload a picture of your latest license
                on your profile. This is only required once and your account
                will then be certified for future firearm sales
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGoToProfile}>
                Modify Profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
