export interface ListingSeller {
  username: string
  email: string | null
  phone: string | null
  contact_preference?: 'email' | 'phone' | 'both'
}

export interface ListingDetails {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  calibre?: string
  type: 'firearms' | 'non_firearms'
  thumbnail: string
  seller_id: string
  created_at: string
  editable_until: string | null
  seller: ListingSeller | null
  images: string[]
  status: string
}
