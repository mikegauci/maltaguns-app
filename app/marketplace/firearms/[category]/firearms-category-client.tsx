'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CategoryListings from '@/components/marketplace/CategoryListings'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useToast } from '@/hooks/use-toast'
import { firearmsCategories } from '@/app/marketplace/create/constants'
import { PageLayout } from '@/components/ui/page-layout'

type Listing = {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  created_at: string
  status: string
  updated_at: string
  is_featured?: boolean
}

type FirearmsCategoryClientProps = {
  categoryKey: keyof typeof firearmsCategories
  categorySlug: string
  initialFeaturedListings: Listing[]
  initialRegularListings: Listing[]
}

export default function FirearmsCategoryClient({
  categoryKey,
  categorySlug,
  initialFeaturedListings,
  initialRegularListings,
}: FirearmsCategoryClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  const isAmmunitionPage = categoryKey === 'ammunition'

  useEffect(() => {
    async function checkAccess() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (isAmmunitionPage) {
          if (!session?.user) {
            router.push('/login')
            return
          }

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
      <PageLayout>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  if (!canAccess) {
    return null
  }

  const categoryLabel =
    firearmsCategories[categoryKey] ||
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)

  return (
    <CategoryListings
      type="firearms"
      category={categoryKey}
      title={categoryLabel}
      description={`Browse ${categoryLabel.toLowerCase()} listings from licensed sellers`}
      initialFeaturedListings={initialFeaturedListings}
      initialRegularListings={initialRegularListings}
    />
  )
}
