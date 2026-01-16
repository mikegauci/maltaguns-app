import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/components/providers/SupabaseProvider'

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

async function fetchHomePageData(): Promise<
  Omit<HomePageData, 'isAuthenticated'>
> {
  const res = await fetch('/api/public/home')
  if (!res.ok) throw new Error('Failed to load homepage data')
  return res.json()
}

export function useHomePageData() {
  const { session } = useSupabase()
  const isAuthenticated = !!session?.user

  const query = useQuery({
    queryKey: ['public-home'],
    queryFn: fetchHomePageData,
  })

  const data: HomePageData = useMemo(
    () => ({
      recentListings: query.data?.recentListings ?? [],
      featuredListings: query.data?.featuredListings ?? [],
      latestPosts: query.data?.latestPosts ?? [],
      latestEvents: query.data?.latestEvents ?? [],
      featuredEstablishments: query.data?.featuredEstablishments ?? [],
      isAuthenticated,
    }),
    [isAuthenticated, query.data]
  )

  return {
    data,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}
