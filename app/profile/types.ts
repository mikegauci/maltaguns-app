import { Database } from '@/lib/database.types'
import * as z from 'zod'

export type Profile = Database['public']['Tables']['profiles']['Row']

export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
})

export type ProfileForm = z.infer<typeof profileSchema>

export interface BlogPost {
  id: string
  title: string
  slug: string
  category: string
  published: boolean
  created_at: string
}

export interface Listing {
  id: string
  title: string
  type: 'firearms' | 'non_firearms'
  category: string
  price: number
  status: string
  created_at: string
  expires_at: string
  is_near_expiration?: boolean
  is_featured?: boolean
  days_until_expiration?: number
  featured_days_remaining?: number
  is_expired: boolean
}

export interface Store {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  owner_id: string
  slug: string
}

export interface Club extends Store {}
export interface Servicing extends Store {}
export interface Range extends Store {}

export interface Event {
  id: string
  title: string
  description: string
  organizer: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string
  poster_url: string | null
  phone: string | null
  email: string | null
  price: number | null
  created_at: string
  slug: string | null
}

export interface CreditTransaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  stripe_payment_id: string | null
  created_at: string
  credit_type: 'featured' | 'event' | null
  description: string | null
  status: string | null
}
