"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun as Gun, Package } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
import Image from "next/image"

export default function CreateListing() {
  const router = useRouter()
  const [showLicenseDialog, setShowLicenseDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    let mounted = true

    async function checkSellerStatus() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          console.error('Auth error:', authError)
          router.push('/login')
          return
        }

        if (!session) {
          console.log('No session found')
          router.push('/login')
          return
        }

        // Validate session expiry
        const sessionExpiry = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
        const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

        if (isNearExpiry) {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshedSession) {
            console.error('Session refresh failed:', refreshError)
            router.push('/login')
            return
          }
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_seller')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          throw profileError
        }

        if (mounted) {
          setIsSeller(profile?.is_seller || false)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error checking seller status:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkSellerStatus()

    return () => {
      mounted = false
    }
  }, [router, supabase])

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
                <Image
                  src="/images/pistol-gun-icon.svg"
                  alt="Firearms"
                  width={20}
                  height={20}
                />
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
              <AlertDialogTitle>License upload required</AlertDialogTitle>
              <AlertDialogDescription>
                To sell firearms on Maltaguns, we must first verify that you are infact licensed. please upload a picture of your latest license on your profile. This is only required once and your account will then be certified for future firearm sales
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