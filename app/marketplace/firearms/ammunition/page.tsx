'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CategoryListings from '@/components/CategoryListings'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'

export default function AmmunitionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isRetailer, setIsRetailer] = useState(false)

  useEffect(() => {
    async function checkRetailerStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          // If not logged in, redirect to login page
          router.push('/login')
          return
        }

        // Check if user is a retailer (has a store)
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', session.user.id)
          .limit(1)

        if (storeError) {
          console.error('Error checking store status:', storeError)
        }

        if (storeData && storeData.length > 0) {
          setIsRetailer(true)
          setIsLoading(false)
        } else {
          // If not a retailer, show toast and redirect to the main firearms page
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'Ammunition listings are only available to registered retailers.',
          })
          router.push('/marketplace/firearms')
        }
      } catch (error) {
        console.error('Error checking retailer status:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to verify retailer status. Please try again.',
        })
        router.push('/marketplace/firearms')
      }
    }

    checkRetailerStatus()
  }, [router, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isRetailer) {
    return null // This shouldn't render as we redirect non-retailers
  }

  return (
    <CategoryListings
      type="firearms"
      category="ammunition"
      title="Ammunition"
      description="Browse ammunition listings from licensed sellers"
    />
  )
}
