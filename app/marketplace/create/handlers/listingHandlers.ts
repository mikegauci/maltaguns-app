import { SupabaseClient } from '@supabase/supabase-js'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { listingPublicPath } from '@/lib/listing-slug'
import { postNotifyCreated } from '@/lib/notify-created-client'

interface CreateListingDependencies {
  supabase: SupabaseClient
  router: AppRouterInstance
  toast: (_options: {
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => void
  setIsSubmitting: (value: boolean) => void
}

export function createListingHandlers(deps: CreateListingDependencies) {
  const { router, toast, setIsSubmitting } = deps

  async function notifyListingCreated(listingId: string): Promise<boolean> {
    return postNotifyCreated('/api/listings/notify-created', { listingId })
  }

  function redirectAfterCreate(listingPath: string, notifyOk: boolean) {
    const params = new URLSearchParams({ created: '1' })
    if (!notifyOk) params.set('notify', '0')
    router.push(`${listingPath}?${params.toString()}`)
  }

  async function createListingViaApi(payload: Record<string, unknown>) {
    const response = await fetch('/api/listings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create listing')
    }

    return result.listing as {
      id: string
      title: string
      slug?: string
    }
  }

  async function createFirearmsListing(data: {
    category: string
    calibre: string
    title: string
    description: string
    price: number
    images: any[]
    credits: number
    setCredits: (credits: number) => void
  }) {
    try {
      setIsSubmitting(true)

      if (data.credits < 1) {
        throw new Error('Insufficient credits')
      }

      const imageUrls = data.images.map(img =>
        typeof img === 'string' ? img : img.toString()
      )

      const listing = await createListingViaApi({
        type: 'firearms',
        category: data.category,
        calibre: data.calibre,
        title: data.title,
        description: data.description,
        price: data.price,
        images: imageUrls,
        currentCredits: data.credits,
      })

      data.setCredits(data.credits - 1)

      const listingPath = listingPublicPath(listing)
      const notifyOk = await notifyListingCreated(listing.id)
      redirectAfterCreate(listingPath, notifyOk)
    } catch (error) {
      console.error('Error creating listing:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      })
      setIsSubmitting(false)
    }
  }

  async function createNonFirearmsListing(data: {
    category: string
    subcategory: string
    title: string
    description: string
    price: number
    images: any[]
  }) {
    try {
      setIsSubmitting(true)

      const imageUrls = data.images.map(img =>
        typeof img === 'string' ? img : img.toString()
      )

      const listing = await createListingViaApi({
        type: 'non_firearms',
        category: data.category,
        subcategory: data.subcategory,
        title: data.title,
        description: data.description,
        price: data.price,
        images: imageUrls,
      })

      const listingPath = listingPublicPath(listing)
      const notifyOk = await notifyListingCreated(listing.id)
      redirectAfterCreate(listingPath, notifyOk)
    } catch (error) {
      console.error('Error creating listing:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      })
      setIsSubmitting(false)
    }
  }

  return {
    createFirearmsListing,
    createNonFirearmsListing,
  }
}
