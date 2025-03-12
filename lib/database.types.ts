export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          birthday: string;
          phone: string | null;
          address: string | null;
          is_seller: boolean;
          license_image: string | null;
          created_at: string;
          email: string | null;
        };
        Insert: {
          id: string;
          username: string;
          birthday: string;
          phone?: string | null;
          address?: string | null;
          is_seller?: boolean;
          license_image?: string | null;
          created_at?: string;
          email?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          birthday?: string;
          phone?: string | null;
          address?: string | null;
          is_seller?: boolean;
          license_image?: string | null;
          created_at?: string;
          email?: string | null;
        };
      };
      licenses: {
        Row: {
          id: string;
          profile_id: string;
          license_number: string | null;
          license_type: string;
          expiry_date: string | null;
          status: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          license_number?: string | null;
          license_type: string;
          expiry_date?: string | null;
          status?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          license_number?: string | null;
          license_type?: string;
          expiry_date?: string | null;
          status?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          type: string;
          category: string;
          subcategory: string | null;
          calibre: string | null;
          title: string;
          description: string;
          price: number;
          images: string; // PostgreSQL array literal string format: {url1,url2,...}
          thumbnail: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          is_featured: boolean;
          featured_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          type: string;
          category: string;
          subcategory?: string | null;
          calibre?: string | null;
          title: string;
          description: string;
          price: number;
          images?: string;
          thumbnail?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          is_featured?: boolean;
          featured_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          type?: string;
          category?: string;
          subcategory?: string | null;
          calibre?: string | null;
          title?: string;
          description?: string;
          price?: number;
          images?: string;
          thumbnail?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          is_featured?: boolean;
          featured_at?: string | null;
          expires_at?: string;
        };
      };
      featured_listings: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          user_id?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      credits: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
