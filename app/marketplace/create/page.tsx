"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun as Gun, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CreateListing() {
  const router = useRouter()
  const [showLicenseDialog, setShowLicenseDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)

  useEffect(() => {
    async function checkSellerStatus() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError || !session) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_seller')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        setIsSeller(profile?.is_seller || false)
      } catch (error) {
        console.error('Error checking seller status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSellerStatus()
  }, [router])

  const handleFirearmsClick = () => {
    if (!isSeller) {
      setShowLicenseDialog(true)
    } else {
      router.push('/marketplace/create/firearms')
    }
  }

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
        <p className="text-muted-foreground mb-8">Choose the type of listing you want to create</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="hover:border-primary/50 cursor-pointer transition-colors"
            onClick={handleFirearmsClick}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gun className="h-5 w-5" />
                Firearms Listing
              </CardTitle>
              <CardDescription>
                Create a listing for firearms, including airguns, pistols, rifles, and more
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
            onClick={() => router.push('/marketplace/create/non-firearms')}
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
                Open to all verified sellers. Includes airsoft, reloading equipment, and accessories.
              </p>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>License Required</AlertDialogTitle>
              <AlertDialogDescription>
                To create firearms listings, you need to upload your firearms license for verification.
                Would you like to upload your license now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push('/profile')}>
                Modify Profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}