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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_achievements: {
        Row: {
          agent_id: string
          code: string
          description_ar: string | null
          description_en: string | null
          earned_at: string
          icon: string | null
          id: string
          title_ar: string
          title_en: string
        }
        Insert: {
          agent_id: string
          code: string
          description_ar?: string | null
          description_en?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          title_ar: string
          title_en: string
        }
        Update: {
          agent_id?: string
          code?: string
          description_ar?: string | null
          description_en?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_achievements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_achievements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      agent_applications: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      agent_campaigns: {
        Row: {
          agent_id: string
          budget: number | null
          category: string | null
          created_at: string
          description: string | null
          end_at: string | null
          id: string
          listing_id: string | null
          name: string
          start_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_url: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          budget?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          listing_id?: string | null
          name: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          budget?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          listing_id?: string | null
          name?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_campaigns_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_landing_pages: {
        Row: {
          agent_id: string
          created_at: string
          custom_content_ar: string | null
          custom_content_en: string | null
          headline_ar: string | null
          headline_en: string | null
          id: string
          listing_id: string
          slug: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          custom_content_ar?: string | null
          custom_content_en?: string | null
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          listing_id: string
          slug: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          custom_content_ar?: string | null
          custom_content_en?: string | null
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          listing_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_landing_pages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_landing_pages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_landing_pages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          bio_ar: string | null
          bio_en: string | null
          city: string | null
          country: string | null
          created_at: string
          headline_ar: string | null
          headline_en: string | null
          id: string
          is_premium: boolean
          is_trusted: boolean
          is_verified: boolean
          languages: string[] | null
          specialties: string[] | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio_ar?: string | null
          bio_en?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          is_premium?: boolean
          is_trusted?: boolean
          is_verified?: boolean
          languages?: string[] | null
          specialties?: string[] | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio_ar?: string | null
          bio_en?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          is_premium?: boolean
          is_trusted?: boolean
          is_verified?: boolean
          languages?: string[] | null
          specialties?: string[] | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_categories: {
        Row: {
          created_at: string
          icon: string | null
          name_ar: string
          name_en: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          name_ar: string
          name_en: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          name_ar?: string
          name_en?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      commissions: {
        Row: {
          agent_id: string
          amount: number
          company_id: string
          created_at: string
          currency: string
          id: string
          listing_id: string | null
          notes: string | null
          paid_at: string | null
          payout_requested_at: string | null
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          agent_id: string
          amount: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payout_requested_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          agent_id?: string
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payout_requested_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commissions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          category_slug: string | null
          city: string | null
          company_type: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          email: string | null
          export_available: boolean
          governorate: string | null
          id: string
          industry: string | null
          is_premium: boolean
          is_verified: boolean
          logo_url: string | null
          name_ar: string
          name_en: string
          owner_id: string
          phone: string | null
          production_capacity: string | null
          subscription_expires_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_updated_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          category_slug?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          email?: string | null
          export_available?: boolean
          governorate?: string | null
          id?: string
          industry?: string | null
          is_premium?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name_ar: string
          name_en: string
          owner_id: string
          phone?: string | null
          production_capacity?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_updated_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          category_slug?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          email?: string | null
          export_available?: boolean
          governorate?: string | null
          id?: string
          industry?: string | null
          is_premium?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          owner_id?: string
          phone?: string | null
          production_capacity?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_updated_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_profiles_extra: {
        Row: {
          achievements: Json
          catalog_pdfs: Json
          company_id: string
          cover_url: string | null
          created_at: string
          downloads_count: number
          gallery: Json
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          achievements?: Json
          catalog_pdfs?: Json
          company_id: string
          cover_url?: string | null
          created_at?: string
          downloads_count?: number
          gallery?: Json
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          achievements?: Json
          catalog_pdfs?: Json
          company_id?: string
          cover_url?: string | null
          created_at?: string
          downloads_count?: number
          gallery?: Json
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_extra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_extra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_referrals: {
        Row: {
          clicks: number
          code: string
          conversions: number
          created_at: string
          id: string
          owner_user_id: string
          signups: number
        }
        Insert: {
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          id?: string
          owner_user_id: string
          signups?: number
        }
        Update: {
          clicks?: number
          code?: string
          conversions?: number
          created_at?: string
          id?: string
          owner_user_id?: string
          signups?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          certifications: Json
          company_id: string
          created_at: string
          employees_range: string | null
          export_available: boolean
          production_capacity: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          certifications?: Json
          company_id: string
          created_at?: string
          employees_range?: string | null
          export_available?: boolean
          production_capacity?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          certifications?: Json
          company_id?: string
          created_at?: string
          employees_range?: string | null
          export_available?: boolean
          production_capacity?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "factories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      favorites: {
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
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          due_at: string | null
          id: string
          invoice_number: string
          metadata: Json
          paid_at: string | null
          payment_id: string | null
          purpose: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          id?: string
          invoice_number: string
          metadata?: Json
          paid_at?: string | null
          payment_id?: string | null
          purpose: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          id?: string
          invoice_number?: string
          metadata?: Json
          paid_at?: string | null
          payment_id?: string | null
          purpose?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          buyer_user_id: string | null
          company_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_line: string | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          city: string | null
          clicks_count: number
          commission_percentage: number | null
          company_id: string
          country: string | null
          created_at: string
          currency: string | null
          description_ar: string | null
          description_en: string | null
          featured: boolean
          featured_until: string | null
          governorate: string | null
          id: string
          image_sources: string[]
          images: string[] | null
          latitude: number | null
          leads_count: number
          location: string | null
          longitude: number | null
          ownership_type: string | null
          pdf_url: string | null
          phone: string | null
          price: number | null
          property_subtype: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title_ar: string
          title_en: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          video_url: string | null
          views_count: number
          whatsapp: string | null
        }
        Insert: {
          address_line?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city?: string | null
          clicks_count?: number
          commission_percentage?: number | null
          company_id: string
          country?: string | null
          created_at?: string
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          featured?: boolean
          featured_until?: string | null
          governorate?: string | null
          id?: string
          image_sources?: string[]
          images?: string[] | null
          latitude?: number | null
          leads_count?: number
          location?: string | null
          longitude?: number | null
          ownership_type?: string | null
          pdf_url?: string | null
          phone?: string | null
          price?: number | null
          property_subtype?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title_ar: string
          title_en: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          video_url?: string | null
          views_count?: number
          whatsapp?: string | null
        }
        Update: {
          address_line?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city?: string | null
          clicks_count?: number
          commission_percentage?: number | null
          company_id?: string
          country?: string | null
          created_at?: string
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          featured?: boolean
          featured_until?: string | null
          governorate?: string | null
          id?: string
          image_sources?: string[]
          images?: string[] | null
          latitude?: number | null
          leads_count?: number
          location?: string | null
          longitude?: number | null
          ownership_type?: string | null
          pdf_url?: string | null
          phone?: string | null
          price?: number | null
          property_subtype?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title_ar?: string
          title_en?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          video_url?: string | null
          views_count?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          duration_ms: number | null
          id: string
          order_ref: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          order_ref?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          order_ref?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_details: Json
          code: string
          created_at: string
          icon: string | null
          id: string
          instructions_ar: string | null
          instructions_en: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_details?: Json
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_details?: Json
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          id: string
          note: string | null
          order_id: string
          payment_method_code: string | null
          payment_method_id: string | null
          proof_url: string | null
          reference: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["payment_proof_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          order_id: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          proof_url?: string | null
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          order_id?: string
          payment_method_code?: string | null
          payment_method_id?: string | null
          proof_url?: string | null
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "wholesale_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          currency: string
          id: string
          listing_id: string | null
          metadata: Json
          provider: string | null
          provider_reference: string | null
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          provider?: string | null
          provider_reference?: string | null
          purpose: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          provider?: string | null
          provider_reference?: string | null
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_methods: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_default: boolean
          kind: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          kind: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          kind?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payout_method_id: string | null
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_method_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_method_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "payout_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          currency: string
          id: boolean
          marketer_commission_pct: number
          min_withdrawal_amount: number
          platform_commission_pct: number
          updated_at: string
          updated_by: string | null
          withdrawal_review_mode: string
        }
        Insert: {
          currency?: string
          id?: boolean
          marketer_commission_pct?: number
          min_withdrawal_amount?: number
          platform_commission_pct?: number
          updated_at?: string
          updated_by?: string | null
          withdrawal_review_mode?: string
        }
        Update: {
          currency?: string
          id?: boolean
          marketer_commission_pct?: number
          min_withdrawal_amount?: number
          platform_commission_pct?: number
          updated_at?: string
          updated_by?: string | null
          withdrawal_review_mode?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          listing_id: string | null
          quantity: number
          quotation_id: string
          title: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          listing_id?: string | null
          quantity?: number
          quotation_id: string
          title: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          listing_id?: string | null
          quantity?: number
          quotation_id?: string
          title?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          buyer_id: string
          conversation_id: string | null
          created_at: string
          currency: string
          discount: number
          expiry_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          seller_company_id: string | null
          seller_id: string
          shipping: number
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          conversation_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          expiry_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          seller_company_id?: string | null
          seller_id: string
          shipping?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          conversation_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          expiry_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          seller_company_id?: string | null
          seller_id?: string
          shipping?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      referrals: {
        Row: {
          agent_id: string
          campaign_id: string | null
          clicks: number
          code: string
          conversions: number
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          agent_id: string
          campaign_id?: string | null
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          agent_id?: string
          campaign_id?: string | null
          clicks?: number
          code?: string
          conversions?: number
          created_at?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "marketer_leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "referrals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "agent_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      rfq_offers: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          id: string
          lead_time_days: number | null
          notes: string | null
          price: number
          rfq_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          price: number
          rfq_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          price?: number
          rfq_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "rfq_offers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          attachments: Json
          budget_max: number | null
          budget_min: number | null
          buyer_id: string
          category_slug: string | null
          created_at: string
          currency: string
          description: string | null
          governorate: string | null
          id: string
          quantity: number | null
          status: string
          title: string
          unit: string | null
          updated_at: string
          winner_offer_id: string | null
        }
        Insert: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          buyer_id: string
          category_slug?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          governorate?: string | null
          id?: string
          quantity?: number | null
          status?: string
          title: string
          unit?: string | null
          updated_at?: string
          winner_offer_id?: string | null
        }
        Update: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string
          category_slug?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          governorate?: string | null
          id?: string
          quantity?: number | null
          status?: string
          title?: string
          unit?: string | null
          updated_at?: string
          winner_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tender_proposals: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          price: number
          status: string
          tender_id: string
          timeline_days: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          price: number
          status?: string
          tender_id: string
          timeline_days?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          price?: number
          status?: string
          tender_id?: string
          timeline_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tender_proposals_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          budget: number | null
          category_slug: string | null
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          governorate: string | null
          id: string
          publisher_id: string
          status: string
          title: string
          updated_at: string
          winner_proposal_id: string | null
        }
        Insert: {
          budget?: number | null
          category_slug?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          governorate?: string | null
          id?: string
          publisher_id: string
          status?: string
          title: string
          updated_at?: string
          winner_proposal_id?: string | null
        }
        Update: {
          budget?: number | null
          category_slug?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          governorate?: string | null
          id?: string
          publisher_id?: string
          status?: string
          title?: string
          updated_at?: string
          winner_proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          governorate: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          governorate: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          recipient_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          governorate?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["wallet_tx_reason"]
          reference_id: string | null
          reference_type: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["wallet_tx_reason"]
          reference_id?: string | null
          reference_type?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["wallet_tx_reason"]
          reference_id?: string | null
          reference_type?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          kind: Database["public"]["Enums"]["wallet_kind"]
          pending_balance: number
          total_earned: number
          total_paid_out: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          kind: Database["public"]["Enums"]["wallet_kind"]
          pending_balance?: number
          total_earned?: number
          total_paid_out?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_kind"]
          pending_balance?: number
          total_earned?: number
          total_paid_out?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wholesale_listings: {
        Row: {
          active: boolean
          category_slug: string | null
          company_id: string
          created_at: string
          currency: string
          description: string | null
          governorate: string | null
          id: string
          images: Json
          moq: number
          price_per_unit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_slug?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          governorate?: string | null
          id?: string
          images?: Json
          moq?: number
          price_per_unit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_slug?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          governorate?: string | null
          id?: string
          images?: Json
          moq?: number
          price_per_unit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wholesale_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_trust"
            referencedColumns: ["company_id"]
          },
        ]
      }
      wholesale_orders: {
        Row: {
          buyer_id: string
          cancelled_reason: string | null
          completed_at: string | null
          confirmed_at: string | null
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          listing_id: string | null
          notes: string | null
          payment_status: string
          product_listing_id: string | null
          quantity: number
          quotation_id: string | null
          shipping_address: Json | null
          status: string
          total_amount: number | null
          tracking_carrier: string | null
          tracking_number: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_status?: string
          product_listing_id?: string | null
          quantity?: number
          quotation_id?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount?: number | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_status?: string
          product_listing_id?: string | null
          quantity?: number
          quotation_id?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount?: number | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "wholesale_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_product_listing_id_fkey"
            columns: ["product_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_trust: {
        Row: {
          avg_rating: number | null
          company_id: string | null
          completed_orders: number | null
          is_premium: boolean | null
          is_verified: boolean | null
          name_ar: string | null
          name_en: string | null
          reviews_count: number | null
          trust_score: number | null
        }
        Insert: {
          avg_rating?: never
          company_id?: string | null
          completed_orders?: never
          is_premium?: boolean | null
          is_verified?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          reviews_count?: never
          trust_score?: never
        }
        Update: {
          avg_rating?: never
          company_id?: string | null
          completed_orders?: never
          is_premium?: boolean | null
          is_verified?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          reviews_count?: never
          trust_score?: never
        }
        Relationships: []
      }
      marketer_leaderboard: {
        Row: {
          achievements_count: number | null
          agent_id: string | null
          avatar_url: string | null
          balance: number | null
          deals_closed: number | null
          name: string | null
          total_earned: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      convert_referral: {
        Args: {
          _amount: number
          _currency?: string
          _notes?: string
          _referral_id: string
        }
        Returns: string
      }
      ensure_wallet: {
        Args: {
          _kind: Database["public"]["Enums"]["wallet_kind"]
          _user_id: string
        }
        Returns: string
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_click: { Args: { _id: string }; Returns: undefined }
      increment_listing_view: { Args: { _id: string }; Returns: undefined }
      increment_referral_click: {
        Args: { _code: string }
        Returns: {
          listing_id: string
        }[]
      }
      is_pure_marketer: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "admin"
        | "company"
        | "agent"
        | "customer"
        | "buyer"
        | "super_admin"
        | "moderator"
        | "support"
        | "factory"
        | "service_provider"
        | "wholesaler"
        | "importer"
        | "exporter"
        | "distributor"
      application_status: "pending" | "accepted" | "rejected"
      campaign_status: "draft" | "active" | "paused" | "ended"
      commission_status: "pending" | "approved" | "paid"
      invoice_status: "pending" | "paid" | "failed" | "refunded" | "void"
      listing_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "pending_review"
      listing_type:
        | "product"
        | "service"
        | "real_estate"
        | "land"
        | "factory"
        | "opportunity"
        | "company"
        | "market"
        | "fish_shed"
      payment_proof_status: "pending" | "approved" | "rejected"
      payout_status: "pending" | "approved" | "rejected" | "paid" | "cancelled"
      quotation_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "cancelled"
        | "converted"
      subscription_plan: "free" | "premium_company" | "premium_agent"
      wallet_kind: "company" | "agent" | "platform"
      wallet_tx_reason:
        | "commission"
        | "referral"
        | "payout"
        | "subscription"
        | "featured"
        | "manual_credit"
        | "manual_debit"
        | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "company",
        "agent",
        "customer",
        "buyer",
        "super_admin",
        "moderator",
        "support",
        "factory",
        "service_provider",
        "wholesaler",
        "importer",
        "exporter",
        "distributor",
      ],
      application_status: ["pending", "accepted", "rejected"],
      campaign_status: ["draft", "active", "paused", "ended"],
      commission_status: ["pending", "approved", "paid"],
      invoice_status: ["pending", "paid", "failed", "refunded", "void"],
      listing_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "pending_review",
      ],
      listing_type: [
        "product",
        "service",
        "real_estate",
        "land",
        "factory",
        "opportunity",
        "company",
        "market",
        "fish_shed",
      ],
      payment_proof_status: ["pending", "approved", "rejected"],
      payout_status: ["pending", "approved", "rejected", "paid", "cancelled"],
      quotation_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "cancelled",
        "converted",
      ],
      subscription_plan: ["free", "premium_company", "premium_agent"],
      wallet_kind: ["company", "agent", "platform"],
      wallet_tx_reason: [
        "commission",
        "referral",
        "payout",
        "subscription",
        "featured",
        "manual_credit",
        "manual_debit",
        "refund",
      ],
    },
  },
} as const
