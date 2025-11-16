import { SupabaseClient } from '@supabase/supabase-js'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { DEFAULT_LISTING_IMAGE } from '../constants'
import { slugify } from '../utils'

interface CreateListingDependencies {
  supabase: SupabaseClient
  router: AppRouterInstance
  toast: (options: {
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => void
  setIsSubmitting: (value: boolean) => void
}

export function createListingHandlers(deps: CreateListingDependencies) {
  const { supabase, router, toast, setIsSubmitting } = deps

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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      // Get all image URLs
      const imageUrls = data.images.map(img =>
        typeof img === 'string' ? img : img.toString()
      )

      console.log('Attempting to create firearms listing with simplified data')

      // Create a simplified listing object
      const listingData = {
        seller_id: session.user.id,
        type: 'firearms',
        category: data.category,
        calibre: data.calibre,
        title: data.title,
        description: data.description,
        price: data.price,
        images:
          imageUrls.length > 0
            ? `{${imageUrls.map(url => `"${url}"`).join(',')}}`
            : `{"${DEFAULT_LISTING_IMAGE}"}`,
        thumbnail: imageUrls[0] || DEFAULT_LISTING_IMAGE,
        status: 'active',
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }

      console.log('Creating listing with data:', listingData)

      // Create the listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select('id, title')
        .single()

      if (listingError) {
        console.error('Error creating listing:', listingError)
        throw listingError
      }

      // Deduct one credit
      const { error: creditError } = await supabase
        .from('credits')
        .update({
          amount: data.credits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        throw creditError
      }

      data.setCredits(data.credits - 1)

      toast({
        title: 'Listing created',
        description: 'Your listing has been created successfully',
      })

      router.push(`/marketplace/listing/${slugify(listing.title)}`)
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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      // Get all image URLs
      const imageUrls = data.images.map(img =>
        typeof img === 'string' ? img : img.toString()
      )

      console.log('Attempting to create non-firearms listing')

      // Create a simplified listing object
      const listingData = {
        seller_id: session.user.id,
        type: 'non_firearms',
        category: data.category,
        subcategory: data.subcategory,
        title: data.title,
        description: data.description,
        price: data.price,
        images:
          imageUrls.length > 0
            ? `{${imageUrls.map(url => `"${url}"`).join(',')}}`
            : `{"${DEFAULT_LISTING_IMAGE}"}`,
        thumbnail: imageUrls[0] || DEFAULT_LISTING_IMAGE,
        status: 'active',
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }

      console.log('Creating listing with data:', listingData)

      // Create the listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select('id, title')
        .single()

      if (listingError) {
        console.error('Error creating listing:', listingError)
        throw listingError
      }

      toast({
        title: 'Listing created',
        description: 'Your listing has been created successfully',
      })

      router.push(`/marketplace/listing/${slugify(listing.title)}`)
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
