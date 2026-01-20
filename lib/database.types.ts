export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          first_name: string | null
          last_name: string | null
          birthday: string
          phone: string | null
          address: string | null
          is_seller: boolean
          is_verified: boolean
          license_image: string | null
          id_card_image: string | null
          id_card_verified: boolean
          license_types: Json | null
          contact_preference: string | null
          license_expiry_date: string | null
          created_at: string
          email: string | null
        }
        Insert: {
          id: string
          username: string
          first_name?: string | null
          last_name?: string | null
          birthday: string
          phone?: string | null
          address?: string | null
          is_seller?: boolean
          is_verified?: boolean
          license_image?: string | null
          id_card_image?: string | null
          id_card_verified?: boolean
          license_types?: Json | null
          contact_preference?: string | null
          license_expiry_date?: string | null
          created_at?: string
          email?: string | null
        }
        Update: {
          id?: string
          username?: string
          first_name?: string | null
          last_name?: string | null
          birthday?: string
          phone?: string | null
          address?: string | null
          is_seller?: boolean
          is_verified?: boolean
          license_image?: string | null
          id_card_image?: string | null
          id_card_verified?: boolean
          license_types?: Json | null
          contact_preference?: string | null
          license_expiry_date?: string | null
          created_at?: string
          email?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          link_url: string | null
          created_at: string
          read_at: string | null
          email_status: string
          email_sent_at: string | null
          email_error: string | null
          dedupe_key: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          link_url?: string | null
          created_at?: string
          read_at?: string | null
          email_status?: string
          email_sent_at?: string | null
          email_error?: string | null
          dedupe_key: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          link_url?: string | null
          created_at?: string
          read_at?: string | null
          email_status?: string
          email_sent_at?: string | null
          email_error?: string | null
          dedupe_key?: string
        }
      }
      licenses: {
        Row: {
          id: string
          profile_id: string
          license_number: string | null
          license_type: string
          expiry_date: string | null
          status: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          license_number?: string | null
          license_type: string
          expiry_date?: string | null
          status?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          license_number?: string | null
          license_type?: string
          expiry_date?: string | null
          status?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          type: string
          category: string
          subcategory: string | null
          calibre: string | null
          title: string
          description: string
          price: number
          images: string // PostgreSQL array literal string format: {url1,url2,...}
          thumbnail: string | null
          status: string
          created_at: string
          updated_at: string
          editable_until: string | null
          relisted_at: string | null
          is_featured: boolean
          featured_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          type: string
          category: string
          subcategory?: string | null
          calibre?: string | null
          title: string
          description: string
          price: number
          images?: string
          thumbnail?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          editable_until?: string | null
          relisted_at?: string | null
          is_featured?: boolean
          featured_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          type?: string
          category?: string
          subcategory?: string | null
          calibre?: string | null
          title?: string
          description?: string
          price?: number
          images?: string
          thumbnail?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          editable_until?: string | null
          relisted_at?: string | null
          is_featured?: boolean
          featured_at?: string | null
          expires_at?: string
        }
      }
      featured_listings: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      credits: {
        Row: {
          id: string
          user_id: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          created_at?: string
        }
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wishlist_listing_id_fkey'
            columns: ['listing_id']
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
        ]
      }
      blog_posts: {
        Row: {
          id: string
          author_id: string
          title: string
          slug: string
          content: string
          featured_image: string | null
          published: boolean
          created_at: string
          updated_at: string
          retailer_id: string | null
          category: string
          store_id: string | null
          club_id: string | null
          range_id: string | null
          servicing_id: string | null
          view_count: number | null
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          slug: string
          content: string
          featured_image?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
          retailer_id?: string | null
          category: string
          store_id?: string | null
          club_id?: string | null
          range_id?: string | null
          servicing_id?: string | null
          view_count?: number | null
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          slug?: string
          content?: string
          featured_image?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
          retailer_id?: string | null
          category?: string
          store_id?: string | null
          club_id?: string | null
          range_id?: string | null
          servicing_id?: string | null
          view_count?: number | null
        }
      }
      retailer_blog_posts: {
        Row: {
          id: string
          retailer_id: string
          author_id: string
          title: string
          slug: string
          content: string
          featured_image: string | null
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          retailer_id: string
          author_id: string
          title: string
          slug: string
          content: string
          featured_image?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          retailer_id?: string
          author_id?: string
          title?: string
          slug?: string
          content?: string
          featured_image?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
