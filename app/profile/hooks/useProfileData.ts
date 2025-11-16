import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

export function useProfileData({ supabase, session, form }: UseProfileDataProps) {
  const router = useRouter()
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
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [listingIdToTitleMap, setListingIdToTitleMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [listingCredits, setListingCredits] = useState(0)
  const [eventCredits, setEventCredits] = useState(0)

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        if (session?.user) {
          setLoading(true)
          const userId = session.user.id

          // Fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (profileError) throw profileError

          setProfile(profileData)
          form.reset({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
          })

          // Fetch listings
          const { data: listingsData, error: listingsError } = await supabase
            .from('listings')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false })

          if (!listingsError) {
            const { data: featuredListingsData } = await supabase
              .from('featured_listings')
              .select('*')
              .eq('user_id', userId)

            const featuredEndDates = new Map(
              (featuredListingsData || []).map(featured => [
                featured.listing_id,
                new Date(featured.end_date),
              ])
            )

            const listingsWithFeatures = (listingsData || []).map((listing: any) => {
              const now = new Date()
              const expirationDate = new Date(listing.expires_at)
              const featuredEndDate = featuredEndDates.get(listing.id)

              const diffTime = expirationDate.getTime() - now.getTime()
              const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              let featuredDaysRemaining = 0
              if (featuredEndDate && featuredEndDate > now) {
                const featuredDiffTime = featuredEndDate.getTime() - now.getTime()
                featuredDaysRemaining = Math.max(0, Math.ceil(featuredDiffTime / (1000 * 60 * 60 * 24)))
              }

              return {
                ...listing,
                is_featured: featuredEndDate ? featuredEndDate > now : false,
                days_until_expiration: daysUntilExpiration,
                featured_days_remaining: featuredDaysRemaining,
                is_near_expiration: daysUntilExpiration <= 3 && daysUntilExpiration > 0,
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

          // Fetch stores and establishments
          const { data: storesData } = await supabase.from('stores').select('*').eq('owner_id', userId)
          if (storesData) setStores(storesData)

          const { data: clubsData } = await supabase.from('clubs').select('*').eq('owner_id', userId)
          if (clubsData) setClubs(clubsData)

          const { data: servicingData } = await supabase.from('servicing').select('*').eq('owner_id', userId)
          if (servicingData) setServicing(servicingData)

          const { data: rangesData } = await supabase.from('ranges').select('*').eq('owner_id', userId)
          if (rangesData) setRanges(rangesData)

          // Fetch blog posts
          const { data: blogPostsData } = await supabase
            .from('blog_posts')
            .select('id, title, slug, published, created_at')
            .eq('author_id', userId)
            .order('created_at', { ascending: false })
          if (blogPostsData) setBlogPosts(blogPostsData)

          // Fetch events
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })
          if (eventsData) setEvents(eventsData)

          // Fetch credits
          const { data: listingCreditsData } = await supabase
            .from('credits')
            .select('amount')
            .eq('user_id', userId)
            .single()
          if (listingCreditsData) setListingCredits(listingCreditsData.amount || 0)

          const { data: eventCreditsData } = await supabase
            .from('credits_events')
            .select('amount')
            .eq('user_id', userId)
            .single()
          if (eventCreditsData) setEventCredits(eventCreditsData.amount || 0)

          // Fetch credit transactions
          const { data: transactionsData } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          if (transactionsData) setCreditTransactions(transactionsData)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          variant: 'destructive',
          title: 'Error loading profile',
          description: 'There was a problem loading your profile data.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, form, toast, session, supabase])

  // Refresh credits from database
  const refreshCredits = useCallback(async () => {
    if (!session?.user) return

    try {
      const userId = session.user.id

      const { data: listingCreditsData } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single()
      if (listingCreditsData) setListingCredits(listingCreditsData.amount || 0)

      const { data: eventCreditsData } = await supabase
        .from('credits_events')
        .select('amount')
        .eq('user_id', userId)
        .single()
      if (eventCreditsData) setEventCredits(eventCreditsData.amount || 0)

      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (transactionsData) setCreditTransactions(transactionsData)
    } catch (error) {
      console.error('Error refreshing credits:', error)
    }
  }, [session?.user, supabase])

  // Auto-refresh credits when window regains focus
  useEffect(() => {
    window.addEventListener('focus', refreshCredits)
    return () => window.removeEventListener('focus', refreshCredits)
  }, [refreshCredits])

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

