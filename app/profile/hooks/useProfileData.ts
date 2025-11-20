import { useState, useEffect, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useToast } from '@/hooks/use-toast'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Profile,
  Listing,
  Store,
  Club,
  Servicing,
  Range,
  Event,
  BlogPost,
  CreditTransaction,
  ProfileForm,
} from '../types'

interface UseProfileDataProps {
  supabase: SupabaseClient
  session: any
  form: UseFormReturn<ProfileForm>
}

export function useProfileData({
  supabase,
  session,
  form,
}: UseProfileDataProps) {
  const { toast } = useToast()

  // State
  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [servicing, setServicing] = useState<Servicing[]>([])
  const [ranges, setRanges] = useState<Range[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [creditTransactions, setCreditTransactions] = useState<
    CreditTransaction[]
  >([])
  const [listingIdToTitleMap, setListingIdToTitleMap] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(true)
  const [listingCredits, setListingCredits] = useState(0)
  const [eventCredits, setEventCredits] = useState(0)

  // Load profile data - optimized with parallel queries
  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const userId = session.user.id

        // Fetch profile first (needed for verification checks)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError
        if (!isMounted) return

        // Fix inconsistent verification states
        let needsUpdate = false
        const updates: any = {}

        if (profileData.id_card_verified && !profileData.id_card_image) {
          updates.id_card_verified = false
          profileData.id_card_verified = false
          needsUpdate = true
        }

        if (profileData.is_verified && !profileData.license_image) {
          updates.is_verified = false
          profileData.is_verified = false
          needsUpdate = true
        }

        if (needsUpdate) {
          await supabase.from('profiles').update(updates).eq('id', userId)
        }

        setProfile(profileData)
        form.reset({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
        })

        // Fetch everything else in parallel for better performance
        const [
          listingsResult,
          featuredResult,
          storesResult,
          clubsResult,
          servicingResult,
          rangesResult,
          blogPostsResult,
          eventsResult,
          listingCreditsResult,
          eventCreditsResult,
          transactionsResult,
        ] = await Promise.all([
          supabase
            .from('listings')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false }),
          supabase.from('featured_listings').select('*').eq('user_id', userId),
          supabase.from('stores').select('*').eq('owner_id', userId),
          supabase.from('clubs').select('*').eq('owner_id', userId),
          supabase.from('servicing').select('*').eq('owner_id', userId),
          supabase.from('ranges').select('*').eq('owner_id', userId),
          supabase
            .from('blog_posts')
            .select('id, title, slug, category, published, created_at')
            .eq('author_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false }),
          supabase.from('credits').select('amount').eq('user_id', userId).single(),
          supabase
            .from('credits_events')
            .select('amount')
            .eq('user_id', userId)
            .single(),
          supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ])

        if (!isMounted) return

        // Process listings with featured status
        if (!listingsResult.error && listingsResult.data) {
          const featuredEndDates = new Map(
            (featuredResult.data || []).map(featured => [
              featured.listing_id,
              new Date(featured.end_date),
            ])
          )

          const now = new Date()
          const listingsWithFeatures = listingsResult.data.map((listing: any) => {
            const expirationDate = new Date(listing.expires_at)
            const featuredEndDate = featuredEndDates.get(listing.id)

            const diffTime = expirationDate.getTime() - now.getTime()
            const daysUntilExpiration = Math.ceil(
              diffTime / (1000 * 60 * 60 * 24)
            )

            let featuredDaysRemaining = 0
            if (featuredEndDate && featuredEndDate > now) {
              const featuredDiffTime = featuredEndDate.getTime() - now.getTime()
              featuredDaysRemaining = Math.max(
                0,
                Math.ceil(featuredDiffTime / (1000 * 60 * 60 * 24))
              )
            }

            return {
              ...listing,
              is_featured: featuredEndDate ? featuredEndDate > now : false,
              days_until_expiration: daysUntilExpiration,
              featured_days_remaining: featuredDaysRemaining,
              is_near_expiration:
                daysUntilExpiration <= 3 && daysUntilExpiration > 0,
              is_expired: daysUntilExpiration <= 0,
            }
          })

          const activeListings = listingsWithFeatures.filter(l => !l.is_expired)
          setListings(activeListings)

          const titleMap: Record<string, string> = {}
          activeListings.forEach((l: any) => {
            titleMap[l.id] = l.title
          })
          setListingIdToTitleMap(titleMap)
        }

        // Set all other data
        if (storesResult.data) setStores(storesResult.data)
        if (clubsResult.data) setClubs(clubsResult.data)
        if (servicingResult.data) setServicing(servicingResult.data)
        if (rangesResult.data) setRanges(rangesResult.data)
        if (blogPostsResult.data) setBlogPosts(blogPostsResult.data)
        if (eventsResult.data) setEvents(eventsResult.data)
        if (listingCreditsResult.data)
          setListingCredits(listingCreditsResult.data.amount || 0)
        if (eventCreditsResult.data)
          setEventCredits(eventCreditsResult.data.amount || 0)
        if (transactionsResult.data)
          setCreditTransactions(transactionsResult.data)
      } catch (error) {
        console.error('Error loading profile:', error)
        if (isMounted) {
          toast({
            variant: 'destructive',
            title: 'Error loading profile',
            description: 'There was a problem loading your profile data.',
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
    // Only reload if user ID changes - not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // Refresh credits (can be called manually when needed)
  const refreshCredits = useCallback(async () => {
    if (!session?.user) return

    try {
      const userId = session.user.id

      const [listingCreditsResult, eventCreditsResult, transactionsResult] =
        await Promise.all([
          supabase.from('credits').select('amount').eq('user_id', userId).single(),
          supabase
            .from('credits_events')
            .select('amount')
            .eq('user_id', userId)
            .single(),
          supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ])

      if (listingCreditsResult.data)
        setListingCredits(listingCreditsResult.data.amount || 0)
      if (eventCreditsResult.data)
        setEventCredits(eventCreditsResult.data.amount || 0)
      if (transactionsResult.data)
        setCreditTransactions(transactionsResult.data)
    } catch (error) {
      console.error('Error refreshing credits:', error)
    }
  }, [session?.user?.id, supabase])

  return {
    profile,
    setProfile,
    listings,
    setListings,
    stores,
    setStores,
    clubs,
    setClubs,
    servicing,
    setServicing,
    ranges,
    setRanges,
    blogPosts,
    setBlogPosts,
    events,
    setEvents,
    creditTransactions,
    setCreditTransactions,
    listingIdToTitleMap,
    loading,
    listingCredits,
    eventCredits,
    refreshCredits,
  }
}
