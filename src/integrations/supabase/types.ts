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
            foreignKeyName: "agent_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          is_verified?: boolean
          languages?: string[] | null
          specialties?: string[] | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
          id: string
          images: string[] | null
          leads_count: number
          location: string | null
          pdf_url: string | null
          price: number | null
          status: Database["public"]["Enums"]["listing_status"]
          title_ar: string
          title_en: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          video_url: string | null
          views_count: number
        }
        Insert: {
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
          id?: string
          images?: string[] | null
          leads_count?: number
          location?: string | null
          pdf_url?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title_ar: string
          title_en: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
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
          id?: string
          images?: string[] | null
          leads_count?: number
          location?: string | null
          pdf_url?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title_ar?: string
          title_en?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          agent_id: string
          clicks: number
          code: string
          conversions: number
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          agent_id: string
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          agent_id?: string
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
            foreignKeyName: "referrals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
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
        ]
      }
      wholesale_orders: {
        Row: {
          buyer_id: string
          contact_phone: string | null
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          quantity: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "wholesale_listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
    }
    Enums: {
      app_role: "admin" | "company" | "agent"
      application_status: "pending" | "accepted" | "rejected"
      commission_status: "pending" | "approved" | "paid"
      listing_status: "draft" | "pending" | "approved" | "rejected"
      listing_type:
        | "product"
        | "service"
        | "real_estate"
        | "land"
        | "factory"
        | "opportunity"
      subscription_plan: "free" | "premium_company" | "premium_agent"
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
      app_role: ["admin", "company", "agent"],
      application_status: ["pending", "accepted", "rejected"],
      commission_status: ["pending", "approved", "paid"],
      listing_status: ["draft", "pending", "approved", "rejected"],
      listing_type: [
        "product",
        "service",
        "real_estate",
        "land",
        "factory",
        "opportunity",
      ],
      subscription_plan: ["free", "premium_company", "premium_agent"],
    },
  },
} as const
