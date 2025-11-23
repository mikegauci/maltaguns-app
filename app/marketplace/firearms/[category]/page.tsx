'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import CategoryListings from '@/components/marketplace/CategoryListings'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'
import {
  firearmsCategories,
  slugToCategoryKey,
} from '@/app/marketplace/create/constants'

interface FirearmsCategoryPageProps {
  params: {
    category: string
  }
}

// Valid firearms categories from constants
const VALID_CATEGORIES = Object.keys(firearmsCategories) as Array<
  keyof typeof firearmsCategories
>

export default function FirearmsCategoryPage({
  params,
}: FirearmsCategoryPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  // Convert URL slug to category key (e.g., "schedule-1" -> "schedule_1")
  const categorySlug = params.category
  const categoryKey = slugToCategoryKey(categorySlug)

  // Validate category exists - trigger 404 if not valid
  if (!VALID_CATEGORIES.includes(categoryKey as any)) {
    notFound()
  }

  const isAmmunitionPage = categoryKey === 'ammunition'

  useEffect(() => {
    async function checkAccess() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // If ammunition page, check retailer status
        if (isAmmunitionPage) {
          if (!session?.user) {
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
            setCanAccess(true)
          } else {
            // Not a retailer, show toast and redirect
            toast({
              variant: 'destructive',
              title: 'Access Denied',
              description:
                'Ammunition listings are only available to registered retailers.',
            })
            router.push('/marketplace/firearms')
            return
          }
        } else {
          // For all other firearms categories, allow access
          setCanAccess(true)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error checking access:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load page. Please try again.',
        })
        router.push('/marketplace/firearms')
      }
    }

    checkAccess()
  }, [categoryKey, isAmmunitionPage, router, toast, supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!canAccess) {
    return null
  }

  // Get the category label from constants
  const categoryLabel =
    firearmsCategories[categoryKey as keyof typeof firearmsCategories] ||
    categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)

  return (
    <CategoryListings
      type="firearms"
      category={categoryKey}
      title={categoryLabel}
      description={`Browse ${categoryLabel.toLowerCase()} listings from licensed sellers`}
    />
  )
}
