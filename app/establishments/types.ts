/**
 * Shared types for all establishment pages
 */

export type EstablishmentType = 'stores' | 'clubs' | 'ranges' | 'servicing'

export interface BaseEstablishment {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  owner_id: string
  slug: string
}

export interface Listing {
  id: string
  title: string
  type: 'firearms' | 'non_firearms'
  category: string
  price: number
  thumbnail: string
  created_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  featured_image: string | null
  created_at: string
  category: string
  author: {
    username: string
  }
}

export interface EstablishmentWithDetails extends BaseEstablishment {
  listings: Listing[]
  blogPosts: BlogPost[]
}
