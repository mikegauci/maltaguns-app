export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      admin_impersonation_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          target_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          target_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admin_impersonation_logs_admin_id_fkey'
            columns: ['admin_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'admin_impersonation_logs_target_id_fkey'
            columns: ['target_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      admin_password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      armory_audit_log: {
        Row: {
          action: string
          created_at: string
          dealer_account_id: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          dealer_account_id?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          dealer_account_id?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'armory_audit_log_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_audit_log_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      armory_buyers: {
        Row: {
          address: string | null
          anonymised_at: string | null
          created_at: string
          dealer_account_id: string
          email: string | null
          first_names: string
          id: string
          licence_number: string | null
          licence_type: string | null
          nickname: string | null
          notes: string | null
          passport_id_number: string | null
          phone_number: string | null
          sms_opt_in: boolean
          surname: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          address?: string | null
          anonymised_at?: string | null
          created_at?: string
          dealer_account_id: string
          email?: string | null
          first_names: string
          id?: string
          licence_number?: string | null
          licence_type?: string | null
          nickname?: string | null
          notes?: string | null
          passport_id_number?: string | null
          phone_number?: string | null
          sms_opt_in?: boolean
          surname: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          address?: string | null
          anonymised_at?: string | null
          created_at?: string
          dealer_account_id?: string
          email?: string | null
          first_names?: string
          id?: string
          licence_number?: string | null
          licence_type?: string | null
          nickname?: string | null
          notes?: string | null
          passport_id_number?: string | null
          phone_number?: string | null
          sms_opt_in?: boolean
          surname?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'armory_buyers_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      armory_dealer_accounts: {
        Row: {
          account_status: Database['public']['Enums']['armory_account_status']
          approved_at: string | null
          approved_by: string | null
          company_name: string
          contact_date_of_birth: string | null
          contact_first_names: string | null
          contact_place_of_birth: string | null
          contact_surname: string | null
          created_at: string
          dealer_licence_expiry: string | null
          dealer_licence_number: string | null
          default_handling_fee_pistol: number | null
          default_handling_fee_rifle: number | null
          email: string | null
          fax_number: string | null
          id: string
          import_column_mapping: Json | null
          owner_id: string
          passport_id_number: string | null
          passport_issue_date: string | null
          passport_issuing_authority: string | null
          phone_number: string | null
          registered_address: string | null
          shipping_allocation_method: string
          status_note: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database['public']['Enums']['armory_account_status']
          approved_at?: string | null
          approved_by?: string | null
          company_name: string
          contact_date_of_birth?: string | null
          contact_first_names?: string | null
          contact_place_of_birth?: string | null
          contact_surname?: string | null
          created_at?: string
          dealer_licence_expiry?: string | null
          dealer_licence_number?: string | null
          default_handling_fee_pistol?: number | null
          default_handling_fee_rifle?: number | null
          email?: string | null
          fax_number?: string | null
          id?: string
          import_column_mapping?: Json | null
          owner_id: string
          passport_id_number?: string | null
          passport_issue_date?: string | null
          passport_issuing_authority?: string | null
          phone_number?: string | null
          registered_address?: string | null
          shipping_allocation_method?: string
          status_note?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database['public']['Enums']['armory_account_status']
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string
          contact_date_of_birth?: string | null
          contact_first_names?: string | null
          contact_place_of_birth?: string | null
          contact_surname?: string | null
          created_at?: string
          dealer_licence_expiry?: string | null
          dealer_licence_number?: string | null
          default_handling_fee_pistol?: number | null
          default_handling_fee_rifle?: number | null
          email?: string | null
          fax_number?: string | null
          id?: string
          import_column_mapping?: Json | null
          owner_id?: string
          passport_id_number?: string | null
          passport_issue_date?: string | null
          passport_issuing_authority?: string | null
          phone_number?: string | null
          registered_address?: string | null
          shipping_allocation_method?: string
          status_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_dealer_accounts_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_dealer_accounts_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      armory_dealer_staff: {
        Row: {
          created_at: string
          dealer_account_id: string
          disabled_at: string | null
          id: string
          name: string | null
          profile_id: string
          role: Database['public']['Enums']['armory_staff_role']
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          disabled_at?: string | null
          id?: string
          name?: string | null
          profile_id: string
          role?: Database['public']['Enums']['armory_staff_role']
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          disabled_at?: string | null
          id?: string
          name?: string | null
          profile_id?: string
          role?: Database['public']['Enums']['armory_staff_role']
        }
        Relationships: [
          {
            foreignKeyName: 'armory_dealer_staff_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_dealer_staff_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      armory_generated_documents: {
        Row: {
          created_at: string
          created_by: string | null
          data_snapshot: Json
          dealer_account_id: string
          doc_type: string
          generation_method: string
          id: string
          inventory_item_id: string | null
          missing_fields_at_print: Json | null
          shipment_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_snapshot: Json
          dealer_account_id: string
          doc_type: string
          generation_method?: string
          id?: string
          inventory_item_id?: string | null
          missing_fields_at_print?: Json | null
          shipment_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_snapshot?: Json
          dealer_account_id?: string
          doc_type?: string
          generation_method?: string
          id?: string
          inventory_item_id?: string | null
          missing_fields_at_print?: Json | null
          shipment_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'armory_generated_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_generated_documents_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_generated_documents_inventory_item_id_fkey'
            columns: ['inventory_item_id']
            isOneToOne: false
            referencedRelation: 'armory_inventory_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_generated_documents_shipment_id_fkey'
            columns: ['shipment_id']
            isOneToOne: false
            referencedRelation: 'armory_shipments'
            referencedColumns: ['id']
          },
        ]
      }
      armory_import_batches: {
        Row: {
          created_at: string
          dealer_account_id: string
          file_name: string
          headers: Json
          id: string
          mapping: Json | null
          rows: Json
          sheet_name: string | null
          status: string
          type_guesses: Json | null
          undone_at: string | null
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          file_name: string
          headers: Json
          id?: string
          mapping?: Json | null
          rows: Json
          sheet_name?: string | null
          status?: string
          type_guesses?: Json | null
          undone_at?: string | null
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          file_name?: string
          headers?: Json
          id?: string
          mapping?: Json | null
          rows?: Json
          sheet_name?: string | null
          status?: string
          type_guesses?: Json | null
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'armory_import_batches_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      armory_inventory_items: {
        Row: {
          acquisition_price: number | null
          amount_paid: number | null
          barrel_type: string | null
          buyer_licence_number: string | null
          buyer_licence_type: string | null
          calibre_display: string | null
          calibre_raw: string | null
          capacity: number | null
          category: string | null
          cip_proof: boolean | null
          client_handling_fee: number | null
          collected_at: string | null
          commissioner_notified_at: string | null
          country_of_manufacture: string | null
          created_at: string
          current_holder_buyer_id: string | null
          current_holder_type: string
          date_paid: string | null
          deactivated: boolean
          deactivation_cert_ref: string | null
          dealer_account_id: string
          deleted_at: string | null
          description_en: string | null
          description_raw: string | null
          egun_domestic_shipping_fee: number | null
          egun_listing_id: string | null
          egun_listing_url: string | null
          eu_category: string | null
          fire_mode: string
          gauge: string | null
          hammer_type: string | null
          id: string
          import_batch_id: string | null
          item_type: string
          loading: string | null
          make: string | null
          model: string | null
          notes: string | null
          on_hold: boolean
          on_hold_reason: string | null
          original_seller: string | null
          other_features: string | null
          payment_status: string
          proforma_barrel_hammer: string | null
          proforma_loading: string | null
          quantity: number
          sale_price: number | null
          schedule_import_doc: string | null
          schedule_line_item_code: string | null
          schedule_overridden: boolean
          schedule_override_reason: string | null
          schedule_proforma: string | null
          serial_number: string | null
          shipment_id: string | null
          sights_type: string | null
          status: string
          transfer_doc_printed_at: string | null
          transferred_at: string | null
          type_description: string | null
          updated_at: string
          year_of_manufacture: string | null
        }
        Insert: {
          acquisition_price?: number | null
          amount_paid?: number | null
          barrel_type?: string | null
          buyer_licence_number?: string | null
          buyer_licence_type?: string | null
          calibre_display?: string | null
          calibre_raw?: string | null
          capacity?: number | null
          category?: string | null
          cip_proof?: boolean | null
          client_handling_fee?: number | null
          collected_at?: string | null
          commissioner_notified_at?: string | null
          country_of_manufacture?: string | null
          created_at?: string
          current_holder_buyer_id?: string | null
          current_holder_type?: string
          date_paid?: string | null
          deactivated?: boolean
          deactivation_cert_ref?: string | null
          dealer_account_id: string
          deleted_at?: string | null
          description_en?: string | null
          description_raw?: string | null
          egun_domestic_shipping_fee?: number | null
          egun_listing_id?: string | null
          egun_listing_url?: string | null
          eu_category?: string | null
          fire_mode?: string
          gauge?: string | null
          hammer_type?: string | null
          id?: string
          import_batch_id?: string | null
          item_type: string
          loading?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          on_hold?: boolean
          on_hold_reason?: string | null
          original_seller?: string | null
          other_features?: string | null
          payment_status?: string
          proforma_barrel_hammer?: string | null
          proforma_loading?: string | null
          quantity?: number
          sale_price?: number | null
          schedule_import_doc?: string | null
          schedule_line_item_code?: string | null
          schedule_overridden?: boolean
          schedule_override_reason?: string | null
          schedule_proforma?: string | null
          serial_number?: string | null
          shipment_id?: string | null
          sights_type?: string | null
          status?: string
          transfer_doc_printed_at?: string | null
          transferred_at?: string | null
          type_description?: string | null
          updated_at?: string
          year_of_manufacture?: string | null
        }
        Update: {
          acquisition_price?: number | null
          amount_paid?: number | null
          barrel_type?: string | null
          buyer_licence_number?: string | null
          buyer_licence_type?: string | null
          calibre_display?: string | null
          calibre_raw?: string | null
          capacity?: number | null
          category?: string | null
          cip_proof?: boolean | null
          client_handling_fee?: number | null
          collected_at?: string | null
          commissioner_notified_at?: string | null
          country_of_manufacture?: string | null
          created_at?: string
          current_holder_buyer_id?: string | null
          current_holder_type?: string
          date_paid?: string | null
          deactivated?: boolean
          deactivation_cert_ref?: string | null
          dealer_account_id?: string
          deleted_at?: string | null
          description_en?: string | null
          description_raw?: string | null
          egun_domestic_shipping_fee?: number | null
          egun_listing_id?: string | null
          egun_listing_url?: string | null
          eu_category?: string | null
          fire_mode?: string
          gauge?: string | null
          hammer_type?: string | null
          id?: string
          import_batch_id?: string | null
          item_type?: string
          loading?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          on_hold?: boolean
          on_hold_reason?: string | null
          original_seller?: string | null
          other_features?: string | null
          payment_status?: string
          proforma_barrel_hammer?: string | null
          proforma_loading?: string | null
          quantity?: number
          sale_price?: number | null
          schedule_import_doc?: string | null
          schedule_line_item_code?: string | null
          schedule_overridden?: boolean
          schedule_override_reason?: string | null
          schedule_proforma?: string | null
          serial_number?: string | null
          shipment_id?: string | null
          sights_type?: string | null
          status?: string
          transfer_doc_printed_at?: string | null
          transferred_at?: string | null
          type_description?: string | null
          updated_at?: string
          year_of_manufacture?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'armory_inventory_items_current_holder_buyer_id_fkey'
            columns: ['current_holder_buyer_id']
            isOneToOne: false
            referencedRelation: 'armory_buyers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_inventory_items_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_inventory_items_import_batch_fk'
            columns: ['import_batch_id']
            isOneToOne: false
            referencedRelation: 'armory_import_batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_inventory_items_shipment_id_fkey'
            columns: ['shipment_id']
            isOneToOne: false
            referencedRelation: 'armory_shipments'
            referencedColumns: ['id']
          },
        ]
      }
      armory_item_images: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          source_type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          source_type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          source_type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_item_images_inventory_item_id_fkey'
            columns: ['inventory_item_id']
            isOneToOne: false
            referencedRelation: 'armory_inventory_items'
            referencedColumns: ['id']
          },
        ]
      }
      armory_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          created_by_label: string | null
          dealer_account_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          created_by_label?: string | null
          dealer_account_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          created_by_label?: string | null
          dealer_account_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_notes_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      armory_notification_events: {
        Row: {
          buyer_id: string
          channel: string
          created_at: string
          dealer_account_id: string
          delivery_status: string
          error: string | null
          id: string
          inventory_item_id: string | null
          message_content: string | null
          provider_ref: string | null
          sent_at: string | null
          shipment_id: string | null
          trigger_type: string
        }
        Insert: {
          buyer_id: string
          channel: string
          created_at?: string
          dealer_account_id: string
          delivery_status?: string
          error?: string | null
          id?: string
          inventory_item_id?: string | null
          message_content?: string | null
          provider_ref?: string | null
          sent_at?: string | null
          shipment_id?: string | null
          trigger_type: string
        }
        Update: {
          buyer_id?: string
          channel?: string
          created_at?: string
          dealer_account_id?: string
          delivery_status?: string
          error?: string | null
          id?: string
          inventory_item_id?: string | null
          message_content?: string | null
          provider_ref?: string | null
          sent_at?: string | null
          shipment_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_notification_events_buyer_id_fkey'
            columns: ['buyer_id']
            isOneToOne: false
            referencedRelation: 'armory_buyers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_notification_events_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_notification_events_inventory_item_id_fkey'
            columns: ['inventory_item_id']
            isOneToOne: false
            referencedRelation: 'armory_inventory_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_notification_events_shipment_id_fkey'
            columns: ['shipment_id']
            isOneToOne: false
            referencedRelation: 'armory_shipments'
            referencedColumns: ['id']
          },
        ]
      }
      armory_ownership_events: {
        Row: {
          buyer_id: string | null
          document_id: string | null
          event_date: string
          event_type: string
          from_label: string
          id: string
          inventory_item_id: string
          to_label: string
        }
        Insert: {
          buyer_id?: string | null
          document_id?: string | null
          event_date?: string
          event_type: string
          from_label: string
          id?: string
          inventory_item_id: string
          to_label: string
        }
        Update: {
          buyer_id?: string | null
          document_id?: string | null
          event_date?: string
          event_type?: string
          from_label?: string
          id?: string
          inventory_item_id?: string
          to_label?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_ownership_events_buyer_id_fkey'
            columns: ['buyer_id']
            isOneToOne: false
            referencedRelation: 'armory_buyers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_ownership_events_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'armory_generated_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'armory_ownership_events_inventory_item_id_fkey'
            columns: ['inventory_item_id']
            isOneToOne: false
            referencedRelation: 'armory_inventory_items'
            referencedColumns: ['id']
          },
        ]
      }
      armory_personal_items: {
        Row: {
          acquisition_date: string | null
          calibre: string | null
          created_at: string
          id: string
          image_url: string | null
          images: string[]
          item_type: string
          make: string | null
          model: string | null
          notes: string | null
          profile_id: string
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          calibre?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          images?: string[]
          item_type?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          profile_id: string
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          calibre?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          images?: string[]
          item_type?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          profile_id?: string
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_personal_items_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      armory_shipment_costs: {
        Row: {
          amount: number
          cost_date: string | null
          created_at: string
          id: string
          label: string
          notes: string | null
          shipment_id: string
        }
        Insert: {
          amount: number
          cost_date?: string | null
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          shipment_id: string
        }
        Update: {
          amount?: number
          cost_date?: string | null
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_shipment_costs_shipment_id_fkey'
            columns: ['shipment_id']
            isOneToOne: false
            referencedRelation: 'armory_shipments'
            referencedColumns: ['id']
          },
        ]
      }
      armory_shipments: {
        Row: {
          arrived_at: string | null
          carrier: string | null
          created_at: string
          dealer_account_id: string
          delivery_address: string | null
          export_authorisation_date: string | null
          export_authorisation_ref: string | null
          id: string
          notes: string | null
          permit_applied_at: string | null
          permit_rejected_reason: string | null
          prior_consent_date: string | null
          prior_consent_ref: string | null
          ready_at: string | null
          reference: string
          sender_address: string | null
          sender_company_name: string | null
          sender_country: string | null
          sender_date_of_birth: string | null
          sender_fax: string | null
          sender_first_names: string | null
          sender_issue_date: string | null
          sender_issuing_authority: string | null
          sender_passport_id: string | null
          sender_phone: string | null
          sender_place_of_birth: string | null
          sender_registered_office: string | null
          sender_surname: string | null
          sender_type: string | null
          shipped_at: string | null
          status: string
          transit_countries: string | null
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          carrier?: string | null
          created_at?: string
          dealer_account_id: string
          delivery_address?: string | null
          export_authorisation_date?: string | null
          export_authorisation_ref?: string | null
          id?: string
          notes?: string | null
          permit_applied_at?: string | null
          permit_rejected_reason?: string | null
          prior_consent_date?: string | null
          prior_consent_ref?: string | null
          ready_at?: string | null
          reference: string
          sender_address?: string | null
          sender_company_name?: string | null
          sender_country?: string | null
          sender_date_of_birth?: string | null
          sender_fax?: string | null
          sender_first_names?: string | null
          sender_issue_date?: string | null
          sender_issuing_authority?: string | null
          sender_passport_id?: string | null
          sender_phone?: string | null
          sender_place_of_birth?: string | null
          sender_registered_office?: string | null
          sender_surname?: string | null
          sender_type?: string | null
          shipped_at?: string | null
          status?: string
          transit_countries?: string | null
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          carrier?: string | null
          created_at?: string
          dealer_account_id?: string
          delivery_address?: string | null
          export_authorisation_date?: string | null
          export_authorisation_ref?: string | null
          id?: string
          notes?: string | null
          permit_applied_at?: string | null
          permit_rejected_reason?: string | null
          prior_consent_date?: string | null
          prior_consent_ref?: string | null
          ready_at?: string | null
          reference?: string
          sender_address?: string | null
          sender_company_name?: string | null
          sender_country?: string | null
          sender_date_of_birth?: string | null
          sender_fax?: string | null
          sender_first_names?: string | null
          sender_issue_date?: string | null
          sender_issuing_authority?: string | null
          sender_passport_id?: string | null
          sender_phone?: string | null
          sender_place_of_birth?: string | null
          sender_registered_office?: string | null
          sender_surname?: string | null
          sender_type?: string | null
          shipped_at?: string | null
          status?: string
          transit_countries?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_shipments_dealer_account_id_fkey'
            columns: ['dealer_account_id']
            isOneToOne: false
            referencedRelation: 'armory_dealer_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      armory_shipping_quotes: {
        Row: {
          carrier_name: string
          created_at: string
          id: string
          notes: string | null
          quote_date: string | null
          quoted_amount: number
          shipment_id: string
          source: string
          status: string
        }
        Insert: {
          carrier_name: string
          created_at?: string
          id?: string
          notes?: string | null
          quote_date?: string | null
          quoted_amount: number
          shipment_id: string
          source?: string
          status?: string
        }
        Update: {
          carrier_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          quote_date?: string | null
          quoted_amount?: number
          shipment_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'armory_shipping_quotes_shipment_id_fkey'
            columns: ['shipment_id']
            isOneToOne: false
            referencedRelation: 'armory_shipments'
            referencedColumns: ['id']
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string | null
          club_id: string | null
          content: string
          created_at: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean | null
          range_id: string | null
          servicing_id: string | null
          slug: string
          store_id: string | null
          title: string
          updated_at: string | null
          view_count: number
        }
        Insert: {
          author_id: string
          category?: string | null
          club_id?: string | null
          content: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          range_id?: string | null
          servicing_id?: string | null
          slug: string
          store_id?: string | null
          title: string
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string
          category?: string | null
          club_id?: string | null
          content?: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          range_id?: string | null
          servicing_id?: string | null
          slug?: string
          store_id?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'blog_posts_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blog_posts_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blog_posts_range_id_fkey'
            columns: ['range_id']
            isOneToOne: false
            referencedRelation: 'ranges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blog_posts_retailer_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blog_posts_servicing_id_fkey'
            columns: ['servicing_id']
            isOneToOne: false
            referencedRelation: 'servicing'
            referencedColumns: ['id']
          },
        ]
      }
      clubs: {
        Row: {
          business_name: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          location: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          phone: string | null
          slug: string | null
          status: string
          website: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_reveal_logs: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contact_reveal_logs_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contact_reveal_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      credit_balances: {
        Row: {
          created_at: string | null
          event_credits: number
          featured_credits: number
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_credits?: number
          featured_credits?: number
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_credits?: number
          featured_credits?: number
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credit_type: string | null
          description: string | null
          external_payment_id: string | null
          id: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_type?: string | null
          description?: string | null
          external_payment_id?: string | null
          id?: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_type?: string | null
          description?: string | null
          external_payment_id?: string | null
          id?: string
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'credit_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits_events: {
        Row: {
          amount: number
          created_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'credits_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      didit_webhook_events: {
        Row: {
          event_id: string
          received_at: string
          session_id: string | null
          status: string | null
          vendor_data: string | null
        }
        Insert: {
          event_id: string
          received_at?: string
          session_id?: string | null
          status?: string | null
          vendor_data?: string | null
        }
        Update: {
          event_id?: string
          received_at?: string
          session_id?: string | null
          status?: string | null
          vendor_data?: string | null
        }
        Relationships: []
      }
      event_credits: {
        Row: {
          amount: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          email: string | null
          end_date: string | null
          end_time: string | null
          id: string
          location: string
          meta_description: string | null
          meta_title: string | null
          organizer: string
          phone: string | null
          poster_url: string | null
          price: number | null
          slug: string | null
          start_date: string
          start_time: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          email?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          location: string
          meta_description?: string | null
          meta_title?: string | null
          organizer: string
          phone?: string | null
          poster_url?: string | null
          price?: number | null
          slug?: string | null
          start_date: string
          start_time?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          email?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          location?: string
          meta_description?: string | null
          meta_title?: string | null
          organizer?: string
          phone?: string | null
          poster_url?: string | null
          price?: number | null
          slug?: string | null
          start_date?: string
          start_time?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      featured_listings: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          listing_id: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          listing_id: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          listing_id?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'featured_listings_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
        ]
      }
      help_faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          tab_id: string
          updated_at: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          tab_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          tab_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'help_faq_items_tab_id_fkey'
            columns: ['tab_id']
            isOneToOne: false
            referencedRelation: 'help_tabs'
            referencedColumns: ['id']
          },
        ]
      }
      help_tab_guides: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          sort_order: number
          tab_id: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          sort_order?: number
          tab_id: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          tab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'help_tab_guides_blog_post_id_fkey'
            columns: ['blog_post_id']
            isOneToOne: false
            referencedRelation: 'blog_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'help_tab_guides_tab_id_fkey'
            columns: ['tab_id']
            isOneToOne: false
            referencedRelation: 'help_tabs'
            referencedColumns: ['id']
          },
        ]
      }
      help_tabs: {
        Row: {
          banner_text: string | null
          created_at: string
          id: string
          published: boolean
          section_description: string
          section_title: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          banner_text?: string | null
          created_at?: string
          id?: string
          published?: boolean
          section_description?: string
          section_title: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          banner_text?: string | null
          created_at?: string
          id?: string
          published?: boolean
          section_description?: string
          section_title?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          effective_date: string | null
          last_updated: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          effective_date?: string | null
          last_updated?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          effective_date?: string | null
          last_updated?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          first_name: string | null
          id: string
          image_url: string | null
          last_name: string | null
          license_number: string | null
          license_type: string
          profile_id: string
          status: string | null
          updated_at: string | null
          verification_message: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          license_number?: string | null
          license_type: string
          profile_id: string
          status?: string | null
          updated_at?: string | null
          verification_message?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          license_number?: string | null
          license_type?: string
          profile_id?: string
          status?: string | null
          updated_at?: string | null
          verification_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'licenses_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      listings: {
        Row: {
          calibre: string | null
          category: string
          created_at: string | null
          description: string
          editable_until: string | null
          expires_at: string | null
          id: string
          images: string | null
          meta_description: string | null
          meta_title: string | null
          price: number
          relisted_at: string | null
          seller_id: string
          status: string | null
          subcategory: string | null
          thumbnail: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          calibre?: string | null
          category: string
          created_at?: string | null
          description: string
          editable_until?: string | null
          expires_at?: string | null
          id?: string
          images?: string | null
          meta_description?: string | null
          meta_title?: string | null
          price: number
          relisted_at?: string | null
          seller_id: string
          status?: string | null
          subcategory?: string | null
          thumbnail?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          calibre?: string | null
          category?: string
          created_at?: string | null
          description?: string
          editable_until?: string | null
          expires_at?: string | null
          id?: string
          images?: string | null
          meta_description?: string | null
          meta_title?: string | null
          price?: number
          relisted_at?: string | null
          seller_id?: string
          status?: string | null
          subcategory?: string | null
          thumbnail?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'listings_seller_id_fkey'
            columns: ['seller_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          email_error: string | null
          email_sent_at: string | null
          email_status: string
          id: string
          link_url: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key: string
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          article_email_opt_out: boolean
          birthday: string | null
          contact_preference: string
          created_at: string | null
          didit_session_created_at: string | null
          didit_session_id: string | null
          didit_session_url: string | null
          email: string | null
          first_name: string | null
          id: string
          identity_document_type: string | null
          identity_first_name: string | null
          identity_last_name: string | null
          identity_review_notes: string[] | null
          identity_status: string | null
          identity_verified: boolean
          identity_verified_at: string | null
          is_admin: boolean | null
          is_disabled: boolean
          is_seller: boolean | null
          is_verified: boolean | null
          last_name: string | null
          license_expiry_date: string | null
          license_image: string | null
          license_types: Json | null
          must_change_password: boolean
          notes: string | null
          phone: string | null
          registration_ip: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          address?: string | null
          article_email_opt_out?: boolean
          birthday?: string | null
          contact_preference?: string
          created_at?: string | null
          didit_session_created_at?: string | null
          didit_session_id?: string | null
          didit_session_url?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          identity_document_type?: string | null
          identity_first_name?: string | null
          identity_last_name?: string | null
          identity_review_notes?: string[] | null
          identity_status?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_admin?: boolean | null
          is_disabled?: boolean
          is_seller?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          license_expiry_date?: string | null
          license_image?: string | null
          license_types?: Json | null
          must_change_password?: boolean
          notes?: string | null
          phone?: string | null
          registration_ip?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          address?: string | null
          article_email_opt_out?: boolean
          birthday?: string | null
          contact_preference?: string
          created_at?: string | null
          didit_session_created_at?: string | null
          didit_session_id?: string | null
          didit_session_url?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          identity_document_type?: string | null
          identity_first_name?: string | null
          identity_last_name?: string | null
          identity_review_notes?: string[] | null
          identity_status?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_admin?: boolean | null
          is_disabled?: boolean
          is_seller?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          license_expiry_date?: string | null
          license_image?: string | null
          license_types?: Json | null
          must_change_password?: boolean
          notes?: string | null
          phone?: string | null
          registration_ip?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      ranges: {
        Row: {
          business_name: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          location: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          phone: string | null
          slug: string | null
          status: string
          website: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      reported_listings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reported_listings_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reported_listings_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      servicing: {
        Row: {
          business_name: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          location: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          phone: string | null
          slug: string | null
          status: string
          website: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          blog_meta_description: string | null
          blog_meta_title: string | null
          default_og_image: string | null
          establishments_meta_description: string | null
          establishments_meta_title: string | null
          events_meta_description: string | null
          events_meta_title: string | null
          id: number
          marketplace_meta_description: string | null
          marketplace_meta_title: string | null
          page_seo: Json
          site_description: string | null
          site_title: string | null
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          blog_meta_description?: string | null
          blog_meta_title?: string | null
          default_og_image?: string | null
          establishments_meta_description?: string | null
          establishments_meta_title?: string | null
          events_meta_description?: string | null
          events_meta_title?: string | null
          id?: number
          marketplace_meta_description?: string | null
          marketplace_meta_title?: string | null
          page_seo?: Json
          site_description?: string | null
          site_title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          blog_meta_description?: string | null
          blog_meta_title?: string | null
          default_og_image?: string | null
          establishments_meta_description?: string | null
          establishments_meta_title?: string | null
          events_meta_description?: string | null
          events_meta_title?: string | null
          id?: number
          marketplace_meta_description?: string | null
          marketplace_meta_title?: string | null
          page_seo?: Json
          site_description?: string | null
          site_title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          business_name: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          location: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          phone: string | null
          slug: string | null
          status: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'retailers_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wishlist_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_featured_credits: {
        Args: { amount_param: number; user_id_param: string }
        Returns: undefined
      }
      add_image_to_listing: {
        Args: { p_image_url: string; p_listing_id: string; p_position: number }
        Returns: undefined
      }
      admin_update_expiry_sql: {
        Args: { listing_id: string; new_expiry: string }
        Returns: Json
      }
      armory_dealer_is_approved: {
        Args: { p_dealer_account_id: string }
        Returns: boolean
      }
      armory_is_dealer_member: {
        Args: { p_dealer_account_id: string }
        Returns: boolean
      }
      armory_user_dealer_account_ids: { Args: never; Returns: string[] }
      broadcast_notification: {
        Args: {
          p_body: string
          p_dedupe_key: string
          p_link_url: string
          p_skip_user_id?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      bypass_update_listing_expiry: {
        Args: { listing_id: string }
        Returns: Json
      }
      create_listing: {
        Args: {
          p_calibre: string
          p_category: string
          p_description: string
          p_price: number
          p_seller_id: string
          p_subcategory: string
          p_thumbnail: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      delete_user_complete: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      extend_listing_expiry: {
        Args: { listing_id: string }
        Returns: {
          calibre: string | null
          category: string
          created_at: string | null
          description: string
          editable_until: string | null
          expires_at: string | null
          id: string
          images: string | null
          meta_description: string | null
          meta_title: string | null
          price: number
          relisted_at: string | null
          seller_id: string
          status: string | null
          subcategory: string | null
          thumbnail: string | null
          title: string
          type: string
          updated_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'listings'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      feature_listing: {
        Args: { listing_id_param: string; user_id_param: string }
        Returns: boolean
      }
      get_event_credits: { Args: { user_id: string }; Returns: number }
      get_featured_credits: { Args: { user_id_param: string }; Returns: number }
      get_user_credits: {
        Args: { user_id_param: string }
        Returns: {
          email: string
          event_credits: number
          featured_credits: number
          firearms_credits: number
          user_id: string
        }[]
      }
      get_user_email: { Args: { user_id: string }; Returns: string }
      handle_feature_credit_purchase: {
        Args: {
          p_external_payment_id: string
          p_listing_id: string
          p_user_id: string
        }
        Returns: Json
      }
      increment_blog_view_count: { Args: { post_id: string }; Returns: number }
      increment_event_credits: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      increment_user_credits: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      insert_notification: {
        Args: {
          p_body: string
          p_dedupe_key: string
          p_link_url: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_listing_featured: { Args: { p_listing_id: string }; Returns: boolean }
      process_pending_transactions: { Args: never; Returns: undefined }
      relist_listing: { Args: { listing_id: string }; Returns: undefined }
      update_listing_images: {
        Args: { p_images: string[]; p_listing_id: string }
        Returns: undefined
      }
      update_listing_safely: {
        Args: {
          p_calibre: string
          p_category: string
          p_description: string
          p_listing_id: string
          p_price: number
          p_subcategory: string
          p_thumbnail: string
          p_title: string
          p_type: string
          p_updated_at: string
        }
        Returns: undefined
      }
      update_listing_status: {
        Args: { listing_id: string; new_status: string }
        Returns: undefined
      }
      update_user_listing: {
        Args: {
          p_expires_at: string
          p_featured_until: string
          p_listing_id: string
        }
        Returns: boolean
      }
      use_featured_credit: {
        Args: { user_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      armory_account_status: 'pending' | 'approved' | 'suspended'
      armory_staff_role: 'owner' | 'staff'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      armory_account_status: ['pending', 'approved', 'suspended'],
      armory_staff_role: ['owner', 'staff'],
    },
  },
} as const
