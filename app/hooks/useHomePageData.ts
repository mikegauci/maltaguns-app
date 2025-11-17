import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

interface Event {
  id: string
  title: string
  start_date: string
  location: string
  type: string
  poster_url: string | null
}

interface Listing {
  id: string
  title: string
  description: string
  price: number
  thumbnail: string
  created_at: string
  is_featured?: boolean
}

interface BlogPost {
  id: string
  title: string
  content: string
  slug: string
  category: string
  featured_image: string | null
  created_at: string
  author: {
    username: string
  }
}

interface Establishment {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  slug: string
  type: 'store' | 'club' | 'servicing' | 'range'
  created_at: string
}

interface HomePageData {
  recentListings: Listing[]
  featuredListings: Listing[]
  latestPosts: BlogPost[]
  latestEvents: Event[]
  featuredEstablishments: Establishment[]
  isAuthenticated: boolean
}

export function useHomePageData() {
  const supabase = createClientComponentClient<Database>()
  const [data, setData] = useState<HomePageData>({
    recentListings: [],
    featuredListings: [],
    latestPosts: [],
    latestEvents: [],
    featuredEstablishments: [],
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchAllData() {
      try {
        setIsLoading(true)
        setError(null)

        const now = new Date().toISOString()

        // Parallelize ALL queries using Promise.allSettled for better error handling
        const [
          listingsResult,
          featuredListingsResult,
          postsResult,
          eventsResult,
          sessionResult,
          storesResult,
          rangesResult,
          servicingResult,
          clubsResult,
        ] = await Promise.allSettled([
          // 1. Recent listings
          supabase
            .from('listings')
            .select('*')
            .eq('status', 'active')
            .gt('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(3),

          // 2. Featured listings
          supabase
            .from('featured_listings')
            .select(
              `
              listing_id,
              listings!inner(*)
            `
            )
            .gt('end_date', now)
            .eq('listings.status', 'active')
            .gt('listings.expires_at', now)
            .order('end_date', { ascending: false })
            .limit(3),

          // 3. Latest blog posts
          supabase
            .from('blog_posts')
            .select(
              `
              *,
              author:profiles(username)
            `
            )
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(3),

          // 4. Latest events (was missing!)
          supabase
            .from('events')
            .select('*')
            .gte('start_date', now)
            .order('start_date', { ascending: true })
            .limit(3),

          // 5. Authentication session
          supabase.auth.getSession(),

          // 6-9. All establishment types in parallel
          supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3),

          supabase
            .from('ranges')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3),

          supabase
            .from('servicing')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3),

          supabase
            .from('clubs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        if (!mounted) return

        // Process results
        const homeData: HomePageData = {
          recentListings: [],
          featuredListings: [],
          latestPosts: [],
          latestEvents: [],
          featuredEstablishments: [],
          isAuthenticated: false,
        }

        // Recent listings
        if (
          listingsResult.status === 'fulfilled' &&
          listingsResult.value.data
        ) {
          homeData.recentListings = listingsResult.value.data
        } else if (listingsResult.status === 'rejected') {
          console.error('Recent listings error:', listingsResult.reason)
        }

        // Featured listings
        if (
          featuredListingsResult.status === 'fulfilled' &&
          featuredListingsResult.value.data
        ) {
          homeData.featuredListings = (
            featuredListingsResult.value.data || []
          ).map((item: any) => ({
            ...(item.listings as any),
            is_featured: true,
          }))
        } else if (featuredListingsResult.status === 'rejected') {
          console.error(
            'Featured listings error:',
            featuredListingsResult.reason
          )
        }

        // Blog posts
        if (postsResult.status === 'fulfilled' && postsResult.value.data) {
          homeData.latestPosts = postsResult.value.data
        } else if (postsResult.status === 'rejected') {
          console.error('Blog posts error:', postsResult.reason)
        }

        // Events
        if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
          homeData.latestEvents = eventsResult.value.data
        } else if (eventsResult.status === 'rejected') {
          console.error('Events error:', eventsResult.reason)
        }

        // Authentication
        if (sessionResult.status === 'fulfilled') {
          homeData.isAuthenticated = !!sessionResult.value.data.session
        }

        // Establishments - combine all types
        const establishments: Establishment[] = []

        const establishmentResults = [
          { result: storesResult, type: 'store' as const },
          { result: rangesResult, type: 'range' as const },
          { result: servicingResult, type: 'servicing' as const },
          { result: clubsResult, type: 'club' as const },
        ]

        establishmentResults.forEach(({ result, type }) => {
          if (result.status === 'fulfilled' && result.value.data) {
            result.value.data.forEach((item: any) => {
              establishments.push({
                ...item,
                type,
              })
            })
          } else if (result.status === 'rejected') {
            console.error(`${type} error:`, result.reason)
          }
        })

        // Sort all establishments by created_at and take top 3
        if (establishments.length > 0) {
          homeData.featuredEstablishments = establishments
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 3)
        }

        if (mounted) {
          setData(homeData)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error fetching homepage data:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
          setIsLoading(false)
        }
      }
    }

    fetchAllData()

    return () => {
      mounted = false
    }
  }, [supabase])

  return { data, isLoading, error }
}
