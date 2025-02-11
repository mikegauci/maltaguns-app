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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
